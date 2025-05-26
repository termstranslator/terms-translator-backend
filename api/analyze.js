export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { url, termsContent } = req.body;

    let score = 65;
    let summary = "Some terms may be worth reviewing.";
    let riskLabel = "⚠ Medium Risk";

    if (termsContent?.toLowerCase().includes("data sharing")) {
      score = 50;
      summary = "This site mentions data sharing with third parties.";
      riskLabel = "⚠ Increased Risk";
    }

    res.status(200).json({
      score,
      summary,
      riskLabel,
      analyzedUrl: url,
    });
  } else {
    res.status(405).json({ message: "Only POST requests allowed" });
  }
}