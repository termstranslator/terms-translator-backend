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

  if (!text && url) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "text/html,application/xhtml+xml"
        }
      });

      const html = await response.text();
      const $ = cheerio.load(html);
      text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);

      if (!text || text.length < 100) {
        return res.status(400).json({ message: "Page content too short to analyze." });
      }
    } catch (err) {
      return res.status(500).json({ message: "Error scraping webpage", error: err.message });
    }
  }

  if (!text) {
    return res.status(400).json({ message: "No text available to analyze." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
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
            content: "You are a legal AI. Evaluate the following Terms of Service and provide a summary and trustworthiness score from 1 to 10."
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      return res.status(500).json({ message: "OpenAI error", status: aiResponse.status, details: data });
    }

    const content = data.choices?.[0]?.message?.content || "No summary available.";
    const scoreMatch = content.match(/(?:score|rating)\D*(\d{1,2})/i);
    const trustScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

    return res.status(200).json({
      summary: content,
      trustScore
    });
  } catch (err) {
    return res.status(500).json({ message: "OpenAI request failed", error: err.message });
  }
}
