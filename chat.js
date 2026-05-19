import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  try {
    const { message, level = "beginner", history = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required." });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-8).map(item => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: String(item.content || "").slice(0, 800)
        }))
      : [];

    const systemPrompt = `
You are Friend, a warm English speaking partner for a Turkish learner.

User level: ${level}

Rules:
- Reply in simple natural English.
- Correct the user's English kindly.
- If the user's sentence is already correct, say it is correct.
- Explain grammar in Turkish, short and clear.
- Ask one follow-up question in English.
- Return ONLY valid JSON.
- JSON keys: reply, corrected, explanation, nextQuestion.
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        ...safeHistory,
        {
          role: "user",
          content: message
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      }
    });

    const raw = response.output_text || "{}";
    const data = JSON.parse(raw);

    return res.status(200).json({
      reply: data.reply || "I understand. Tell me more.",
      corrected: data.corrected || "",
      explanation: data.explanation || "",
      nextQuestion: data.nextQuestion || "Can you tell me more?"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "AI cevabı alınamadı. OPENAI_API_KEY veya model ayarını kontrol et."
    });
  }
}