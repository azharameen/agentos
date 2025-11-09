'use server';

import { mockStreamResponse } from '@/mocks/api';

const useMocks = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt') || '';

  if (!useMocks) {
    const errorResponse = {
      type: 'RUN_ERROR',
      data: { error: 'Backend not implemented. Set NEXT_PUBLIC_USE_MOCK_API=true in .env file.' },
    };
    const chunk = `data: ${JSON.stringify(errorResponse)}\n\n`;
    return new Response(chunk, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  }
  
  // Use the mock streaming implementation
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (chunk: string) => {
        // The mock API already JSON.stringifys the object, so we just format it for SSE
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      };

      try {
        await mockStreamResponse(prompt, write);
      } catch (e) {
        console.error('Mock stream error:', e);
        const errorEvent = {
          type: 'RUN_ERROR',
          data: { error: 'An unexpected error occurred in the mock stream.' },
        };
        write(JSON.stringify(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
