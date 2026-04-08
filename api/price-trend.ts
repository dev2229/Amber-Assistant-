import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  const city = (req.query.city as string) || "London";
  
  // Mock data generation logic
  const basePrice = city.toLowerCase() === "london" ? 25000 : 18000;
  const trend = [
    basePrice,
    basePrice - 500,
    basePrice - 1200,
    basePrice - 800,
    basePrice - 200
  ];
  
  res.status(200).json({ trend });
}
