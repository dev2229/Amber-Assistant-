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
