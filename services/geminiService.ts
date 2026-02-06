
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanAndParseJSON = (text: string | undefined): any => {
  if (!text) return null;
  // Handle markdown blocks and common conversational prefixes
  let clean = text.replace(/```json\s*|```/g, '').trim();
  const match = clean.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) clean = match[0];
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw Text:", text);
    return null;
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Handles retries specifically for 429 errors with exponential backoff and jitter.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes("429") || error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isRateLimit && retries > 0) {
      const delay = baseDelay + Math.random() * 1000; // Add jitter
      console.warn(`Quota exceeded. Retrying in ${Math.round(delay)}ms... (${retries} left)`);
      await wait(delay);
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

export const parseTransactionWithAI = async (input: string): Promise<any> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this transaction into JSON: "${input}". 
      RULES:
      1. Map "BOUGHT" or "PURCHASED" to "BUY". 
      2. Map "SOLD" to "SELL".
      3. Identify currency (USD or CAD). If TSX or Canadian stock, use CAD. If NASDAQ/NYSE, use USD. Default to USD if unclear.
      4. Fields: date, type(BUY/SELL), symbol, name, shares, price, account, exchange, currency.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["BUY", "SELL"] },
            symbol: { type: Type.STRING },
            name: { type: Type.STRING },
            shares: { type: Type.NUMBER },
            price: { type: Type.NUMBER },
            account: { type: Type.STRING },
            exchange: { type: Type.STRING },
            currency: { type: Type.STRING, enum: ["USD", "CAD"] }
          },
          required: ["type", "symbol", "shares", "price", "currency"]
        }
      }
    });
    return cleanAndParseJSON(response.text);
  });
};

export const parseDocumentsWithAI = async (files: { mimeType: string; data: string }[]): Promise<any[]> => {
  return withRetry(async () => {
    const ai = getAI();
    const parts = files.map(file => {
      if (file.mimeType.includes('csv') || file.mimeType.includes('text') || file.mimeType.includes('excel')) {
        try {
          const textContent = new TextDecoder().decode(Uint8Array.from(atob(file.data), c => c.charCodeAt(0)));
          return { text: `\n--- DOC ---\n${textContent}\n` };
        } catch (e) { console.warn("Fallback to blob", e); }
      }
      return { inlineData: { mimeType: file.mimeType, data: file.data } };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [...parts, { text: `Return a JSON array of BUY/SELL transactions found in these documents. 
        MANDATORY RULES:
        1. "type" MUST be exactly "BUY" or "SELL". (Map BOUGHT/SOLD/PURCHASED accordingly).
        2. "currency" MUST be "USD" or "CAD". Look for symbols like $ vs C$ or exchange names (TSX vs NASDAQ).
        3. If exchange is missing but symbol ends in .TO, exchange is TSX and currency is CAD.
        4. Provide: symbol, exchange, type, shares, price, name, date, currency.` }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["BUY", "SELL"] },
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              shares: { type: Type.NUMBER },
              price: { type: Type.NUMBER },
              account: { type: Type.STRING },
              exchange: { type: Type.STRING },
              currency: { type: Type.STRING, enum: ["USD", "CAD"] },
            },
            required: ["date", "type", "symbol", "shares", "price", "name", "exchange", "currency"]
          }
        }
      }
    });
    return cleanAndParseJSON(response.text) || [];
  });
};

export const fetchCurrentPrices = async (
  symbols: string[]
): Promise<{ prices: Record<string, number>, sources: any[] }> => {
  if (symbols.length === 0) return { prices: {}, sources: [] };

  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Perform a search to find the latest real-time stock prices for these tickers: ${symbols.join(', ')}.
      
      MANDATORY OUTPUT FORMAT:
      You must return ONLY a JSON object mapping ticker symbols to their current numerical price. 
      Example: {"AAPL": 150.25, "SHOP.TO": 75.10}
      
      Ensure prices are in the native currency of the ticker (e.g. SHOP.TO in CAD, AAPL in USD).
      Do not include currency symbols in the JSON values, only numbers.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const rawPrices = cleanAndParseJSON(response.text) || {};
    const normalizedPrices: Record<string, number> = {};
    Object.entries(rawPrices).forEach(([key, value]) => {
      // Ensure key is uppercase and value is a valid number
      const price = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
      if (typeof price === 'number' && !isNaN(price)) {
        normalizedPrices[key.toUpperCase()] = price;
      }
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { prices: normalizedPrices, sources };
  }, 1, 5000);
};
