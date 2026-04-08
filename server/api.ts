import express from 'express';
import chatHandler from '../api/chat';
import priceTrendHandler from '../api/price-trend';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    await chatHandler(req, res);
  } catch (error) {
    console.error("Chat Router Error:", error);
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
