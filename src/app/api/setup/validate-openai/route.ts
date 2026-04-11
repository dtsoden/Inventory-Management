import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Setup-time endpoint that validates an OpenAI API key by attempting to
 * list available models. Used by the setup wizard to confirm the key is
 * valid and populate the model dropdown before saving.
 *
 * Only accessible while setup is incomplete to prevent abuse.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const setupState = await prisma.setupState.findUnique({ where: { id: 1 } });
    if (setupState?.isSetupComplete) {
      return NextResponse.json(
        { success: false, error: 'Setup has already been completed.' },
        { status: 403 },
      );
    }

    const { apiKey } = (await req.json()) as { apiKey?: string };
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: 'API key is required.' },
        { status: 400 },
      );
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key or OpenAI API unreachable.' },
        { status: 400 },
      );
    }

    const data = (await response.json()) as { data: Array<{ id: string }> };
    const models = data.data
      .filter((m) => m.id.includes('gpt'))
      .map((m) => ({ id: m.id }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ success: true, data: { models } });
  } catch (error) {
    console.error('POST /api/setup/validate-openai error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate API key.' },
      { status: 500 },
    );
  }
}
