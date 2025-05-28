// File: /api/analyze.js

import cheerio from "cheerio";
import fetch from "node-fetch";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests allowed" });
  }

  let { text, url } = req.body;

  // Step 1: Scrape the webpage text if no text is provided
  if (!text && url) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });

      const html = await response.text();
      const $ = cheerio.load(html);
      text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000); // Cap input length

      if (!text || text.length < 100) {
        return res.status(400).json({ message: "Page content too short to analyze." });
      }
    } catch (err) {
      console.error("Scraping failed:", err);
      return res.status(500).json({ message: "Error scraping webpage." });
    }
  }

  if (!text) {
    return res.status(400).json({ message: "No text available to analyze." });
  }

  // Step 2: Call OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is missing");
    return res.status(500).json({ message: "Missing OpenAI API key." });
  }

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "You are a legal assistant. Analyze this Terms of Service and rate its fairness from 1 (untrustworthy) to 10 (very trustworthy).",
          },
          {
            role: "user",
            content: `Please analyze and rate the following Terms of Service:\n\n${text}`,
          },
        ],
      }),
    });

    const data = await aiResponse.json();
    const message = data.choices?.[0]?.message?.content || "No response.";

    // Step 3: Extract trust score from response
    let trustScore = null;
    const match = message.match(/(?:score|rating)\D*(\d{1,2})/i);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 10) trustScore = num;
    }

    return res.status(200).json({
      summary: message,
      trustScore,
    });
  } catch (err) {
    console.error("OpenAI call failed:", err);
    return res.status(500).json({ message: "OpenAI request failed." });
  }
}
