import type { ResponseInput } from 'openai/resources/responses/responses';
import { OpenAIClient } from '@/lib/ai/OpenAIClient';

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

const SYSTEM_PROMPT = `You are a warehouse receiving assistant. You analyze packing slips and extract structured data.

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
- Return ONLY valid JSON, no markdown or extra text`;

function parseExtractionResponse(content: string): PackingSlipExtraction {
  const jsonString = content
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const parsed = JSON.parse(jsonString) as PackingSlipExtraction;
  return {
    orderNumber: parsed.orderNumber ?? null,
    vendorName: parsed.vendorName ?? null,
    lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
  };
}

async function extract(input: string | ResponseInput): Promise<PackingSlipExtraction> {
  const { client, model } = await OpenAIClient.fromSettings();
  const content = await client.text({
    model,
    instructions: SYSTEM_PROMPT,
    input,
    json: true,
    temperature: 0.1,
  });
  if (!content) throw new Error('No response received from OpenAI');
  return parseExtractionResponse(content);
}

export async function extractPackingSlipData(
  imageBase64: string,
): Promise<PackingSlipExtraction> {
  return extract([
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: 'Extract the order number, vendor name, and all line items from this packing slip image. Return the data as JSON.',
        },
        {
          type: 'input_image',
          image_url: `data:image/jpeg;base64,${imageBase64}`,
          detail: 'high',
        },
      ],
    },
  ]);
}

export async function extractPackingSlipFromText(
  text: string,
): Promise<PackingSlipExtraction> {
  return extract(
    `Extract the order number, vendor name, and all line items from this packing slip document. Return the data as JSON.\n\n---\n\n${text}`,
  );
}
