import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// Safety check for process.env in browser
const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI features will not work.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const priceTrendTool: FunctionDeclaration = {
  name: "get_price_trend",
  description: "Get predicted price trend for a city and month for student housing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: { type: Type.STRING, description: "City name, e.g. Pune, London, Sydney" },
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
1. Detect intent: Pricing/best time to book, Visa requirements, General FAQ, or Anything else.
2. If pricing/best time to book: Use the get_price_trend tool.
3. If visa requirements: Use your knowledge to provide specific details (confirmed admission, proof of funds, etc.).
4. If FAQ: Use the provided FAQ table.
5. Otherwise: Answer directly.

FAQ Table:
${FAQ_TABLE}

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
        // Fetch from our internal API
        const apiRes = await fetch(`/api/price-trend?city=${encodeURIComponent(city)}`);
        const data = await apiRes.json();
        
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
