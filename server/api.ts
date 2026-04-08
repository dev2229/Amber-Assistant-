import express from 'express';
import priceTrendHandler from '../api/price-trend';
import geminiHandler from '../api/gemini';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Gemini Secure Endpoint
router.post('/gemini', async (req, res) => {
  try {
    await geminiHandler(req, res);
  } catch (error) {
    console.error("Gemini Router Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Price trend endpoint
router.get('/price-trend', async (req, res) => {
  try {
    await priceTrendHandler(req, res);
  } catch (error) {
    console.error("Price Trend Router Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
