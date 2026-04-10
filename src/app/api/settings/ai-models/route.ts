import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';

export async function GET() {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can view AI settings');
    }

    // Get the stored API key
    const apiKeyConfig = await prisma.systemConfig.findUnique({
      where: { key: 'openai_api_key' },
    });

    const apiKey = apiKeyConfig?.value || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key is not configured. Add it in the AI tab first.',
      }, { status: 400 });
    }

    // Call OpenAI models endpoint
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorText}`,
      }, { status: response.status });
    }

    const data = await response.json();

    // Filter to only chat-capable models (those containing 'gpt')
    const chatModels = (data.data as Array<{ id: string; created: number }>)
      .filter((model) => model.id.includes('gpt'))
      .map((model) => ({ id: model.id }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({
      success: true,
      data: chatModels,
    });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Error fetching AI models:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
