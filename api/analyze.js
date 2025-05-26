export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST requests allowed" });

  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "No text provided." });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `
You are a legal trust evaluator AI.

Respond ONLY in the following JSON format:

{
  "trustScore": XX,
  "summary": "Short, plain-English summary of key risks or terms"
}

Your response must include both fields. If you cannot determine a trust score, return "trustScore": null.
`
          },
          {
            role: "user",
            content: `Analyze and score these Terms of Service:\n\n${text}`,
          }
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let json;
    try {
      json = JSON.parse(content);
    } catch (e) {
      return res.status(200).json({
        trustScore: null,
        summary: "Unable to parse structured score. AI response: " + content,
      });
    }

    res.status(200).json({
      trustScore: json.trustScore,
      summary: json.summary,
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
