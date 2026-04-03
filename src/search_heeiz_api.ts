import { GoogleGenAI } from "@google/genai";

async function searchHeeizAPI() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Find the API documentation or endpoints for Heeiz (Iraq digital cards platform). Specifically looking for endpoints to sync products, send product data, and manage stock/inventory. If no public docs exist, describe the typical integration pattern for such platforms in Iraq.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  console.log(response.text);
}

searchHeeizAPI();
