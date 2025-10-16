import { ChatAgent } from "./do_chat";
import type { ChatRequest } from "./types";

export interface Env {
  CHAT_AGENT: DurableObjectNamespace;
  AI: unknown;
  MODEL: string;
  MEMORY_MAX_MESSAGES: string;
  SUMMARIZE_EVERY_N_TURNS: string;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // ---- API routes ----
    // Session ID (from cookie; generate if missing)
    const sid = readSid(request) ?? crypto.randomUUID();

    // POST /api/chat  -> forwards to DO /chat
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body = (await request.json()) as ChatRequest;
      const id = env.CHAT_AGENT.idFromName(body.sessionId || sid);
      const stub = env.CHAT_AGENT.get(id);
      return await stub.fetch(new Request(new URL("/chat", request.url).toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: body.message }),
      }));
    }

    // POST /api/clear -> forwards to DO /clear
    if (url.pathname === "/api/clear" && request.method === "POST") {
      const id = env.CHAT_AGENT.idFromName(sid);
      const stub = env.CHAT_AGENT.get(id);
      return await stub.fetch(new URL("/clear", request.url).toString(), { method: "POST" });
    }

    // GET /api/export -> forwards to DO /export
    if (url.pathname === "/api/export" && request.method === "GET") {
      const id = env.CHAT_AGENT.idFromName(sid);
      const stub = env.CHAT_AGENT.get(id);
      return await stub.fetch(new URL("/export", request.url).toString());
    }

    const assetResp = await env.ASSETS.fetch(request);
    const assetResp = await env.ASSETS.fetch(request);
    if (url.pathname === "/" && !readSid(request)) {
      return withSidCookie(assetResp, sid);
    }
    return assetResp;
  },

  ChatAgent,
} satisfies ExportedHandler<Env> & { ChatAgent: DurableObjectConstructor };

// --- helpers ---

function readSid(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)sid=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function withSidCookie(resp: Response, sid: string): Response {
  const headers = new Headers(resp.headers);
  headers.append(
    "Set-Cookie",
    `sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}
