// File: /api/analyze.js

import cheerio from "cheerio";
import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST requests allowed" });

  let { text, url } = req.body;

  if (!text && url) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);
      text = $('body').text().replace(/\s+/g, ' ').trim();
    } catch (err) {
      console.error("Error scraping URL:", err);
      return res.status(500).json({ message: "Failed to scrape URL content." });
    }
  }

  if (!text) return res.status(400).json({ message: "No text provided and scraping failed or URL missing." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY in environment variables");
    return res.status(500).json({ message: "OPENAI_API_KEY is not defined on the server." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You're a legal AI that evaluates website terms of service for user transparency and fairness.",
          },
          {
            role: "user",
            content: `Evaluate the following Terms of Service and provide a summary and trustworthiness score (1 to 10):\n\n${text}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "No response from AI.";

    return res.status(200).json({
      trustScore: null,
      summary: aiMessage,
    });
  } catch (err) {
    console.error("Error calling OpenAI:", err);
    return res.status(500).json({ message: "Error processing request." });
  }
}
