import { runLLM } from "./llm";
import type { Memory } from "./types";

export class ChatAgent {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async #getMemory(): Promise<Memory> {
    const memory = (await this.state.storage.get<Memory>("memory")) || {
      turns: [],
      count: 0,
    };
    return memory;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path.endsWith("/chat")) {
      const body = await request.json<{ message: string }>();
      return this.#handleChat(body.message);
    }

    if (request.method === "POST" && path.endsWith("/clear")) {
      await this.state.storage.delete("memory");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    if (request.method === "GET" && path.endsWith("/export")) {
      const memory = await this.#getMemory();
      return new Response(JSON.stringify(memory, null, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async #handleChat(userMessage: string): Promise<Response> {
    const memory = await this.#getMemory();

    memory.turns.push({ role: "user", content: userMessage, ts: Date.now() });
    memory.count += 1;

    const MAX = Number(this.env.MEMORY_MAX_MESSAGES || 24);
    while (memory.turns.length > MAX) memory.turns.shift();

    const context: { role: string; content: string }[] = [];
    for (const t of memory.turns) context.push({ role: t.role, content: t.content });

    const reply = await runLLM(this.env, context);

    memory.turns.push({ role: "assistant", content: reply, ts: Date.now() });

    // summarization and alarms removed

    await this.state.storage.put("memory", memory);

    return new Response(JSON.stringify({ reply }), {
      headers: { "content-type": "application/json" },
    });
  }

  // alarm/summarization removed
}
