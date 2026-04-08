import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import type { Request, Response } from "express";

/**
 * SERVERLESS FUNCTION: Gemini API Handler
 * 
 * This function handles Gemini API requests securely on the server side.
 * It uses the GEMINI_API_KEY from the server's environment variables.
 * 
 * NOTE: In this specific preview environment, calling Gemini from the frontend 
 * is often more reliable for streaming and avoiding proxy-related connection issues.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const priceTrendTool: FunctionDeclaration = {
  name: "get_price_trend",
  description: "Get predicted price trend for a city and month for student housing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: { type: Type.STRING, description: "City name, e.g. London, Sydney, New York" },
      month: { type: Type.INTEGER, description: "Month number 1-12 (optional)" }
    },
    required: ["city"]
  }
};

export default async function handler(req: Request, res: Response) {
  if (!ai) {
    return res.status(500).json({ 
      error: "Gemini API key is not configured on the server. Please ensure GEMINI_API_KEY is set in your environment variables." 
    });
  }

  const { messages, stream = false } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format. Expected an array of content parts." });
  }

  try {
    if (stream) {
      // Implementation for Streaming (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const result = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          tools: [{ functionDeclarations: [priceTrendTool] }]
        }
      });

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    } else {
      // Standard JSON Response
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          tools: [{ functionDeclarations: [priceTrendTool] }]
        }
      });

      return res.json({ text: response.text });
    }
  } catch (error) {
    console.error("Gemini Serverless Error:", error);
    return res.status(500).json({ 
      error: "The AI service encountered an error. This may be due to connection limits or invalid configuration.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
