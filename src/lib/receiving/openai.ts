import OpenAI from 'openai';

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

async function getOpenAI() {
  const { getOpenAIKey, getOpenAIModel } = await import('@/lib/config/vault');
  const apiKey = await getOpenAIKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set it in Settings > Integrations.');
  }
  const modelId = await getOpenAIModel();
  return { client: new OpenAI({ apiKey }), modelId };
}

export async function extractPackingSlipData(
  imageBase64: string,
): Promise<PackingSlipExtraction> {
  const { client, modelId } = await getOpenAI();

  const response = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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
    max_completion_tokens: 2000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response received from OpenAI');
  return parseExtractionResponse(content);
}

export async function extractPackingSlipFromText(
  text: string,
): Promise<PackingSlipExtraction> {
  const { client, modelId } = await getOpenAI();

  const response = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract the order number, vendor name, and all line items from this packing slip document. Return the data as JSON.\n\n---\n\n${text}`,
      },
    ],
    max_completion_tokens: 2000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response received from OpenAI');
  return parseExtractionResponse(content);
}
