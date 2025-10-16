import { Ai } from "@cloudflare/ai";

const SYSTEM_PROMPT = `You are a concise, helpful assistant. Keep answers short unless more detail is requested. If code is shown, ensure it runs. Avoid speculation. Be kind.`;

function runLLM(env: any, messages: { role: string; content: string }[], model?: string) {
  const ai = new Ai(env.AI);
  const chosen = model || env.MODEL || "@cf/meta/llama-3.3-8b-instruct";
  return ai.run(chosen, { messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages] })
    .then((result: any) => (result?.response || result?.result || "").toString());
}

function summarize(env: any, text: string) {
  const ai = new Ai(env.AI);
  const model = env.MODEL || "@cf/meta/llama-3.3-8b-instruct";
  const prompt = `Summarize the following conversation in <=120 words, preserving key facts and user preferences.\n\n${text}`;
  return ai.run(model, { prompt }).then((result: any) => (result?.response || result?.result || "").toString());
}

export class ChatAgent {
  state: any;
  env: any;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  async #getMemory(): Promise<any> {
    const memory = (await this.state.storage.get("memory")) || {
      turns: [],
      summary: "",
      count: 0,
    };
    return memory;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path.endsWith("/chat")) {
      const body = await request.json();
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
    if (memory.summary)
      context.push({ role: "system", content: `Conversation summary: ${memory.summary}` });
    for (const t of memory.turns) context.push({ role: t.role, content: t.content });

  const reply = await runLLM(this.env, context);

    memory.turns.push({ role: "assistant", content: reply, ts: Date.now() });

    const every = Number(this.env.SUMMARIZE_EVERY_N_TURNS || 8);
    if (memory.turns.length % every === 0) {
      await this.state.storage.setAlarm(Date.now() + 5_000);
    }

    await this.state.storage.put("memory", memory);

    return new Response(JSON.stringify({ reply }), {
      headers: { "content-type": "application/json" },
    });
  }

  async alarm(): Promise<void> {
    const memory = await this.#getMemory();
    const transcript = memory.turns.map((t: any) => `${t.role}: ${t.content}`).join("\n");
  const s = await summarize(this.env, transcript);
    memory.summary = s;
    await this.state.storage.put("memory", memory);
  }
}

export default { ChatAgent };
