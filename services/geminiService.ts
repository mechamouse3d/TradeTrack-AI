
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Strictly adhering to initialization guidelines:
 * Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseTransactionWithAI = async (input: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following stock transaction details from the user input into a structured JSON object. 
      Input: "${input}"
      
      If information is missing, try to infer it reasonably (e.g., if no year, use current year) or leave it null.
      Assume 'Buy' if not specified.
      Currency should be inferred from exchange if possible (e.g., TSX -> CAD, NASDAQ -> USD), default to USD.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            type: { type: Type.STRING, description: "BUY or SELL" },
            symbol: { type: Type.STRING, description: "Stock Ticker Symbol, e.g., AAPL" },
            name: { type: Type.STRING, description: "Company Name" },
            shares: { type: Type.NUMBER },
            price: { type: Type.NUMBER },
            account: { type: Type.STRING, description: "Account type like TFSA, RRSP, Cash" },
            exchange: { type: Type.STRING, description: "Exchange like NASDAQ, NYSE, TSX" },
            currency: { type: Type.STRING, description: "USD or CAD" }
          },
          required: ["type", "symbol", "shares", "price"]
        }
      }
    });

    // Access the .text property directly (property, not a method).
    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini parsing error:", error);
    throw error;
  }
};

export const parseDocumentsWithAI = async (files: { mimeType: string; data: string }[]): Promise<any[]> => {
  try {
    const parts = files.map(file => ({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    }));

    // Use gemini-3-pro-preview for complex reasoning and multi-document analysis tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          ...parts,
          {
            text: `Analyze the provided documents (images, PDFs, or CSVs) and extract all stock purchase or sale transactions.
            
            Return a JSON ARRAY of transactions.
            
            For each transaction found:
            1. **Date**: Extract the trade date or settlement date formatted as YYYY-MM-DD.
            2. **Type**: Identify if it is a BUY or SELL.
            3. **Symbol**: Extract the ticker symbol. If the symbol is not explicitly listed, INFER it from the Company Name (e.g., "Bank of Nova Scotia" -> "BNS").
            4. **Name**: The full company name.
            5. **Shares**: The quantity of shares.
            6. **Price**: The price per share.
            7. **Account**: The account type or number (e.g., "TFSA", "RRSP", "Cash", or "669-747...").
            8. **Currency**: Extract currency (e.g., USD, CAD). If price shows "C$" or similar, use CAD.
            9. **Exchange**: Infer the exchange if possible (e.g., TSX for Canadian stocks, NASDAQ/NYSE for US), otherwise leave null.

            Ignore non-trade rows like dividends, interest, or headers.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              type: { type: Type.STRING },
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              shares: { type: Type.NUMBER },
              price: { type: Type.NUMBER },
              account: { type: Type.STRING },
              exchange: { type: Type.STRING },
              currency: { type: Type.STRING },
            },
            required: ["date", "type", "shares", "price", "name"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Gemini document parsing error:", error);
    throw error;
  }
};

/**
 * Fetch current market prices using Google Search grounding.
 */
export const fetchCurrentPrices = async (symbols: string[]): Promise<{ prices: Record<string, number>, sources: any[] }> => {
  if (symbols.length === 0) return { prices: {}, sources: [] };

  try {
    // Search grounding is a complex task; upgrade to gemini-3-pro-preview.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Provide the current (today's) market price for the following stock ticker symbols: ${symbols.join(', ')}. 
      Please respond with a JSON object where keys are the symbols and values are the current prices as numbers. 
      If you cannot find a price, set it to null.`,
      config: {
        tools: [{ googleSearch: {} }],
        // Grounding Metadata will contain the source citations.
      }
    });

    // Guidelines for Search Grounding: "The output response.text may not be in JSON format; do not attempt to parse it as JSON."
    // We use a regex to safely extract only the JSON part from the response text, as citations are often appended.
    let prices = {};
    const text = response.text;
    if (text) {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          prices = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn("Failed to extract JSON from grounded search response:", text);
      }
    }
    
    // Extract sources for display as required by search grounding guidelines.
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { prices, sources };
  } catch (error) {
    console.error("Error fetching live prices:", error);
    return { prices: {}, sources: [] };
  }
};
