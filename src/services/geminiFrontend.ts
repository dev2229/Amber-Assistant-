import { fetchGeminiStream } from "../api/gemini";

export async function* streamChatWithAmber(messages: any[]) {
  try {
    const stream = fetchGeminiStream(messages);

    for await (const text of stream) {
      yield text;
    }
  } catch (error) {
    console.error("Gemini Service Error:", error);
    yield "I'm sorry, I encountered an error. Please try again later.";
  }
}
