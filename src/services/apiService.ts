/**
 * Service for interacting with our internal backend APIs.
 * This is kept separate from AI logic to maintain clean architecture
 * and ensure compatibility with Vercel serverless functions.
 */

export async function getPriceTrend(city: string) {
  try {
    const response = await fetch(`/api/price-trend?city=${encodeURIComponent(city)}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch price trend:", error);
    throw error;
  }
}

export async function chatWithAmber(messages: any[]) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to chat with AI");
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Chat API Error:", error);
    throw error;
  }
}
