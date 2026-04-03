import { GoogleGenAI } from "@google/genai";

async function searchHeeiz() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "What is Heeiz and what does its API provide? Answer in Arabic if possible, or English.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  console.log(response.text);
}

searchHeeiz();
