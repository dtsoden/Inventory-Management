import OpenAI from 'openai';
import { prisma } from '@/lib/db';

export interface ExtractedLineItem {
  name: string;
  quantity: number;
  serialNumbers: string[];
}

export interface PackingSlipExtraction {
  orderNumber: string | null;
  vendorName: string | null;
  lineItems: ExtractedLineItem[];
}

/**
 * Sends a base64-encoded packing slip image to OpenAI Vision API
 * and returns structured extraction data.
 */
export async function extractPackingSlipData(
  imageBase64: string
): Promise<PackingSlipExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Configure it in your .env file or system settings.'
    );
  }

  const openai = new OpenAI({ apiKey });

  // Read configured model from SystemConfig, fall back to gpt-4o-mini
  const modelConfig = await prisma.systemConfig.findUnique({
    where: { key: 'openai_model' },
  });
  const modelId = modelConfig?.value || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: 'system',
        content: `You are a warehouse receiving assistant. You analyze images of packing slips and extract structured data.

Return a JSON object with this exact structure:
{
  "orderNumber": "string or null if not visible",
  "vendorName": "string or null if not visible",
  "lineItems": [
    {
      "name": "item description",
      "quantity": 1,
      "serialNumbers": ["SN123", "SN456"]
    }
  ]
}

Rules:
- Extract all line items visible on the packing slip
- If serial numbers are listed, include them in the serialNumbers array
- If no serial numbers are visible for an item, return an empty array
- Return ONLY valid JSON, no markdown or extra text`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract the order number, vendor name, and all line items from this packing slip image. Return the data as JSON.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response received from OpenAI');
  }

  // Parse the JSON response, stripping any markdown code fences
  const jsonString = content
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonString) as PackingSlipExtraction;
    return {
      orderNumber: parsed.orderNumber ?? null,
      vendorName: parsed.vendorName ?? null,
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
    };
  } catch {
    throw new Error(`Failed to parse OpenAI response as JSON: ${jsonString}`);
  }
}
