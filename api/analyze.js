import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  try {
    const { url, text } = req.body;

    if (!url && !text) {
      return res.status(400).json({ error: "Missing url or text." });
    }

    const prompt = text
      ? `Summarize the following terms:\n\n${text}`
      : `Summarize the terms of service at this URL:\n${url}`;

    console.log("⏳ Sending to OpenAI...");

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      timeout: 15000 // 15s safety limit
    });

    const output = completion.data.choices[0].message.content;
    console.log("✅ OpenAI responded.");
    return res.status(200).json({ summary: output });

  } catch (error) {
    console.error("🔥 Server crash:", error.message, error.response?.data);
    return res.status(500).json({
      error: error.message || "Unknown server error",
      details: error.response?.data || "No response from OpenAI"
    });
  }
}
