export default async function handler(req, res) {
  // Handle CORS
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
You are a legal trust evaluator.

For the following Terms of Service text:
1. Provide a brief, plain-English summary (1–3 sentences max).
2. Assign a **Trust Score from 1–100** based on risk, clarity, and user-friendliness.
3. Always format the trust score clearly as: Trust Score: XX%

Be objective. If a score cannot be determined, respond with:
"Trust Score: N/A"
`
          },
          {
            role: "user",
            content: `Please analyze and score the following Terms of Service:\n\n${text}`,
          }
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No summary available.";

    // Extract trust score using regex
    const scoreMatch = content.match(/trust score[^\d]{0,5}(\d{1,3})/i);
    const trustScore = scoreMatch ? parseInt(scoreMatch[1]) : null;

    res.status(200).json({
      trustScore: trustScore,
      summary: content,
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
