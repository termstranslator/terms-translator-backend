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

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    const output = completion.data.choices[0].message.content;
    return res.status(200).json({ summary: output });
  } catch (error) {
    console.error("Server error:", error.message);
    return res.status(500).send("Server error occurred.");
  }
}
