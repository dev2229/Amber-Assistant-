import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { getPriceTrend } from "./apiService";

// Vite replaces process.env.GEMINI_API_KEY with the actual value during build
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Only initialize if we have a valid-looking key
const isValidKey = GEMINI_API_KEY && 
                   GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && 
                   GEMINI_API_KEY !== "";

if (!isValidKey) {
  console.warn("Amber Assistant: GEMINI_API_KEY is not set or is using the placeholder. AI features will be disabled.");
}

const ai = isValidKey ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

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

export async function chatWithAmber(messages: any[]) {
  if (!ai) {
    return "I'm sorry, but the AI service is not configured correctly. Please check the API key.";
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages,
      config: {
        systemInstruction: `You are an AI assistant for Amber Student, a student-housing marketplace.
Your job is to answer user questions in a concise, friendly tone (max 2-3 sentences).
Follow this decision tree:
1. Detect intent: Pricing/best time to book, Visa requirements, Best cities/Housing search, General FAQ, or Anything else.
2. If pricing/best time to book: Use the get_price_trend tool.
3. If visa requirements: Use your knowledge to provide specific details (confirmed admission, proof of funds, etc.).
4. If best cities/housing search: Use the Country-City Guide to recommend top student cities and explain that Amber Student helps find verified housing near major universities in these locations.
5. If FAQ: Use the provided FAQ table.
6. Otherwise: Answer directly.

FAQ Table:
${FAQ_TABLE}

Country-City Guide:
${COUNTRY_CITY_GUIDE}

Response style:
- Friendly and student-oriented ("Hey there!").
- Concise (2-3 sentences).
- Translate tool data into natural language.`,
        tools: [{ functionDeclarations: [priceTrendTool] }]
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "get_price_trend") {
        const { city } = call.args as { city: string };
        // Fetch from our internal API service
        const data = await getPriceTrend(city);
        
        // Send back to Gemini to format the answer
        const modelContent = response.candidates?.[0]?.content;
        if (!modelContent) throw new Error("No model content in response");

        const followUp = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            ...messages,
            modelContent,
            { role: "user", parts: [{ functionResponse: { name: "get_price_trend", response: data } }] }
          ],
          config: {
            systemInstruction: "Format the price trend data into a friendly, concise recommendation for the student."
          }
        });
        
        return followUp.text;
      }
    }

    return response.text;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
}
