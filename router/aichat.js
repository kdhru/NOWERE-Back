import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { history = [], userMemory } = req.body;

    // Dynamic Prompt Injection Engineering
    const customizedSystemPrompt = `
You are an advanced, context-aware AI assistant equipped with full vision capabilities. 

CRITICAL BACKGROUND CONTEXT ABOUT THIS USER:
--------------------------------------------------
${userMemory || "No explicit user background preferences recorded yet."}
--------------------------------------------------

INSTRUCTIONS:
1. PERSONALIZATION: Adapt all responses, tone, explanations, and technical levels to seamlessly respect the user facts outlined above.
2. CHAT ISOLATION: Rely strictly on the chat history provided in this request payload to handle context for this exact thread. Never assume context from unprovided external threads.
3. VISION CAPABILITIES: You can view and accurately analyze images, flowcharts, graphs, or code layouts sent by the user.
4. EFFICIENCY: Avoid filler speech, greetings, and conversational handoffs. State facts cleanly using Markdown hierarchy.
`.trim();

    // 🚀 Dynamic conversion into OpenRouter Multimodal formatting arrays
    const messages = [
      { role: "system", content: customizedSystemPrompt },
      ...history.map((msg) => {
        const isUser = msg.role === "user";
        
        if (isUser && msg.image) {
          return {
            role: "user",
            content: [
              { type: "text", text: msg.content },
              { type: "image_url", image_url: { url: msg.image } } // Injects base64 image data url natively
            ]
          };
        }
        
        return {
          role: isUser ? "user" : "assistant",
          content: msg.content
        };
      })
    ];

    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: messages,
      temperature: 0.5,
      max_tokens: 1500,
    });

    const reply = response.choices?.[0]?.message?.content || "No response generated.";

    res.json({ reply });
  } catch (error) {
    console.error("AI Core Processing Error:", error);
    res.status(500).json({ error: "AI failed" });
  }
});

export default router;