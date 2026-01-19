import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';

export interface ScannedItem {
    id?: string;
    name: string;
    price: number;
    quantity: number;
}

export interface ScanResult {
    items: ScannedItem[];
    subtotal: number;
    delivery: number;
    tax: number;
    service: number;
    total: number;
}

@Injectable()
export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    }

    async scanReceipt(base64Data: string, mimeType: string): Promise<ScanResult> {
        const prompt = `
    Analyze this receipt image and extract the following details in strict JSON format:
    1. List of individual items ordered (name, price, quantity). 
       - IMPORTANT: If an item has a quantity > 1 (e.g., "x6", "qty 6", "6 wings"), YOU MUST return X SEPARATE entries for that item.
       - Example: "2x Burger $20" (where $20 is total) -> Return TWO items: { "name": "Burger", "price": 10.00, "quantity": 1 }, { "name": "Burger", "price": 10.00, "quantity": 1 }
       - If the price listed is the UNIT price, preserve it. If it is the TOTAL price for the group, divide it by the quantity.
       - Basically, I want a FLAT list where every item has quantity 1.
    2. Delivery fee (if any).
    3. Tax amount.
    4. Service charge / Tip (if any).
    5. Subtotal and Total.

    Return ONLY raw JSON with this structure, no markdown:
    {
      "items": [{ "name": "Burger", "price": 10.50, "quantity": 1 }, { "name": "Burger", "price": 10.50, "quantity": 1 }],
      "delivery": 5.00,
      "tax": 2.50,
      "service": 3.00,
      "subtotal": 50.00,
      "total": 60.50
    }
  `;

        try {
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                },
            ]);

            const response = await result.response;
            const text = response.text();

            const jsonString = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const data = JSON.parse(jsonString);

            return {
                items: (data.items || []).map((item: any) => ({
                    ...item,
                    id: randomUUID(),
                })),
                subtotal: data.subtotal || 0,
                delivery: data.delivery || 0,
                tax: data.tax || 0,
                service: data.service || 0,
                total: data.total || 0,
            };
        } catch (error: any) {
            console.error('AI Scan Error:', error);
            throw new InternalServerErrorException(error.message || 'Unknown error during AI scan');
        }
    }
}
