export default async function handler(req, res) {
  try {
    const { url, text } = req.body;

    console.log("Incoming request:", { url, text });

    if (!url && !text) {
      return res.status(400).json({ error: "Missing url or text." });
    }

    const prompt = text
      ? `Summarize the following terms:\n\n${text}`
      : `Summarize the terms of service at this URL: ${url}`;

    // TEST MODE: Don't call OpenAI yet — just echo back the prompt
    return res.status(200).json({ summary: `✅ Test Success:\n\n${prompt.slice(0, 200)}...` });

    // Uncomment below after confirming it works:
    /*
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    const output = completion.data.choices[0].message.content;
    return res.status(200).json({ summary: output });
    */

  } catch (error) {
    console.error("Server error:", error.message);
    return res.status(500).send("Server error occurred.");
  }
}
