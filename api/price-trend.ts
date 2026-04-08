import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  const city = (req.query.city as string) || "Pune";
  
  // Mock data generation logic
  const basePrice = city.toLowerCase() === "pune" ? 15000 : 25000;
  const trend = [
    basePrice,
    basePrice - 500,
    basePrice - 1200,
    basePrice - 800,
    basePrice - 200
  ];
  
  res.status(200).json({ trend });
}
