import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import type { Request, Response } from "express";

/**
 * SERVERLESS FUNCTION: Gemini API Handler
 * 
 * This function handles Gemini API requests securely on the server side.
 * It uses the GEMINI_API_KEY from the server's environment variables.
 */

let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing. Please add your GEMINI_API_KEY to the 'Secrets' panel in the Settings menu (gear icon) to enable the AI assistant.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

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

const FAQ_TABLE = `
Q: How do I cancel a booking?  
A: You can cancel up to 48 hours before the check-in date for a full refund via the “My Bookings” page.

Q: What documents are required for a booking?  
A: A valid ID, proof of enrollment, and a signed lease agreement.

Q: How does Amber Student make money?  
A: We charge a 10% commission on each successful booking and offer premium listing services to landlords.

Q: Do you offer short-term sublet options?  
A: Yes – you can list a sublet for a minimum of 30 days through the “Sublet” tab.

Q: Is the platform available on mobile?  
A: Yes, we have native iOS and Android apps with all core features.
`;

const COUNTRY_CITY_GUIDE = `
United Kingdom: London, Manchester, Birmingham, Glasgow, Liverpool.
Australia: Sydney, Melbourne, Brisbane, Perth, Adelaide.
Ireland: Dublin, Cork, Galway, Limerick.
United States: New York, Los Angeles, Chicago, Boston, San Francisco.
Canada: Toronto, Vancouver, Montreal, Ottawa, Calgary.
Germany: Berlin, Munich, Hamburg, Frankfurt, Cologne.
Spain: Madrid, Barcelona, Valencia, Seville.
New Zealand: Auckland, Wellington, Christchurch.
France: Paris, Lyon, Marseille, Toulouse.
Singapore: Central Area, Jurong East, Tampines.
`;

const SYSTEM_INSTRUCTION = `You are an AI Housing Advisor for Amber Student.
Your goal is to HELP STUDENTS MAKE CONFIDENT DECISIONS step-by-step.

⚡ CRITICAL: KEEP IT SHORT (MAX 5-6 LINES)
- DO NOT give long, multi-section responses.
- Break conversations into steps.
- Ask only 1–2 questions at a time.
- Avoid long explanations unless asked.
- Prioritize clarity over completeness.

🧠 USER CONTEXT:
First-time international students. Tone: Clear, reassuring, honest, and simple.

💬 RESPONSE STYLE:
1. Recommend and explain WHY briefly.
2. Ask 1-2 smart follow-up questions (Budget, City, Uni distance, etc.).
3. Mention verification or risks honestly.

FAQ Table:
${FAQ_TABLE}

Country-City Guide:
${COUNTRY_CITY_GUIDE}

Decision Tree:
1. Detect intent: Pricing/best time to book, Visa requirements, Best cities/Housing search, General FAQ, or Anything else.
2. If pricing/best time to book: Use the get_price_trend tool.
3. If visa requirements: Provide specific details briefly.
4. If best cities/housing search: Recommend top cities from the guide.
5. If FAQ: Use the provided FAQ table.
6. Otherwise: Answer directly using the Advisor persona.`;

export default async function handler(req: Request, res: Response) {
  let ai: GoogleGenAI;
  try {
    ai = getAiClient();
  } catch (error) {
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal Server Error" 
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
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [priceTrendTool] }]
        }
      });

      let hasFunctionCall = false;
      let functionCall: any = null;

      for await (const chunk of result) {
        const calls = chunk.functionCalls;
        if (calls && calls.length > 0) {
          hasFunctionCall = true;
          functionCall = calls[0];
          break; // Exit stream to handle function call
        }

        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      if (hasFunctionCall && functionCall) {
        if (functionCall.name === "get_price_trend") {
          const { city } = functionCall.args as { city: string };
          // Note: In a real app, you'd fetch this from your database or another API
          // For now, we'll return a mock trend or implement the logic here
          const trendData = {
            city,
            trend: "Rising",
            averagePrice: "£250/week",
            recommendation: "Book now to lock in current rates."
          };

          const followUp = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: [
              ...messages,
              { role: "model", parts: [{ functionCall }] },
              { role: "user", parts: [{ functionResponse: { name: "get_price_trend", response: trendData } }] }
            ],
            config: {
              systemInstruction: "You are the Amber Student AI Housing Advisor. Briefly explain the price trend and ask 1 follow-up question. Keep it under 4 lines."
            }
          });

          for await (const chunk of followUp) {
            const text = chunk.text;
            if (text) {
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }
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
          systemInstruction: SYSTEM_INSTRUCTION,
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
