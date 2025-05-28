import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  let rawText = "";

  try {
    // ✅ Try fast scrape first
    const response = await axios.get(url, { timeout: 7000 });
    const $ = cheerio.load(response.data);
    rawText = $("body").text().trim();
    if (!rawText || rawText.length < 1000) throw new Error("Too little content from cheerio");
  } catch (axiosError) {
    console.warn("Basic scraping failed, using Puppeteer...");

    try {
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
      rawText = await page.evaluate(() => document.body.innerText);
      await browser.close();
    } catch (puppeteerError) {
      console.error("Puppeteer failed:", puppeteerError);
      return res.status(500).json({
        message: "Error scraping webpage",
        error: puppeteerError.message,
      });
    }
  }

  try {
    // ✅ OpenAI call (replace this with your real implementation)
    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Analyze this website's Terms of Service and return a JSON object with: score, flag, summary, date, and a breakdown array with categories and comments.",
          },
          {
            role: "user",
            content: rawText,
          },
        ],
        temperature: 0.3,
      }),
    });

    const json = await result.json();
    const parsed = JSON.parse(json.choices[0].message.content); // assumes JSON output from GPT

    res.status(200).json(parsed);
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "OpenAI request failed", message: err.message });
  }
}
