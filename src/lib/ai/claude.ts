import Anthropic from "@anthropic-ai/sdk";

// ─── 클라이언트 싱글턴 ─────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 4096;

// ─── 타입 ──────────────────────────────────────────────────
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
  temperature?: number;
}

// ─── 일반 응답 (non-streaming) ─────────────────────────────
export async function chat(
  messages: Message[],
  options: ChatOptions = {}
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = MAX_TOKENS,
    system,
    temperature,
  } = options;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system && { system }),
    ...(temperature !== undefined && { temperature }),
    messages,
  });

  const block = response.content[0];
  if (block.type === "text") {
    return block.text;
  }

  return "";
}

// ─── 스트리밍 응답 ─────────────────────────────────────────
export async function chatStream(
  messages: Message[],
  options: ChatOptions = {}
): Promise<ReadableStream<string>> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = MAX_TOKENS,
    system,
    temperature,
  } = options;

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    ...(system && { system }),
    ...(temperature !== undefined && { temperature }),
    messages,
  });

  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(event.delta.text);
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// ─── Next.js Route Handler용 스트리밍 Response 헬퍼 ────────
export async function streamResponse(
  messages: Message[],
  options: ChatOptions = {}
): Promise<Response> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = MAX_TOKENS,
    system,
    temperature,
  } = options;

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    ...(system && { system }),
    ...(temperature !== undefined && { temperature }),
    messages,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
