import { embed } from "./embed";

export class IndexerDO {
  state: DurableObjectState; env: any;
  constructor(state: DurableObjectState, env: any){ this.state = state; this.env = env; }

  async fetch(req: Request) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/index") {
      const { url: seed, maxPages = 50 } = await req.json<{ url: string; maxPages?: number }>();
      const origin = new URL(seed).origin;

      const queue: string[] = [seed];
      const seen = new Set<string>();
      let pages = 0;

      while (queue.length && pages < maxPages) {
        const next = queue.shift()!;
        if (seen.has(next)) continue;
        seen.add(next);

        if (!(await allowed(next))) continue;

        try {
          const res = await fetch(next, { cf: { cacheTtl: 300 } });
          const type = res.headers.get("content-type") || "";
          if (!res.ok || !type.includes("text/html")) continue;

          const html = await res.text();
          const text = extractText(html);
          const chunks = split(text, 1200, 200);

          if (chunks.length) {
            const vecs = await embed(this.env, chunks);
            await this.env.DOC_INDEX.upsert(
              chunks.map((c, i) => ({
                id: `${next}#${i}`,
                values: vecs[i],
                metadata: { url: next, t: c.slice(0, 200) }
              }))
            );
          }

          for (const link of getLinks(html, next)) {
            if (sameOrigin(origin, link)) queue.push(link);
          }

          pages++;
        } catch { /* ignore individual fetch/indexing errors */ }
      }

      return json({ ok: true, pages });
    }

    return new Response("Not found", { status: 404 });
  }
}

function json(obj: any) {
  return new Response(JSON.stringify(obj), { headers: { "content-type": "application/json" } });
}

async function allowed(pageUrl: string): Promise<boolean> {
  // Basic robots.txt Disallow check for User-agent: *
  try {
    const u = new URL(pageUrl);
    const res = await fetch(`${u.origin}/robots.txt`, { cf: { cacheTtl: 300 } });
    if (!res.ok) return true;
    const txt = await res.text();
    const lines = txt.split(/\r?\n/).map(l => l.trim());
    let uaAll = false;
    const path = u.pathname;
    for (const line of lines) {
      if (/^User-agent:\s*\*/i.test(line)) { uaAll = true; continue; }
      if (uaAll && /^Disallow:/i.test(line)) {
        const rule = line.split(":")[1]?.trim() || "";
        if (rule && path.startsWith(rule)) return false;
      }
      if (/^User-agent:/i.test(line) && !/^User-agent:\s*\*/i.test(line)) uaAll = false;
    }
    return true;
  } catch { return true; }
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function split(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += (size - overlap)) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function getLinks(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*"([^"]+)"/gi;
  const b = new URL(base);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], b);
      if (u.protocol === "http:" || u.protocol === "https:") out.push(u.toString());
    } catch {}
  }
  return out;
}

function sameOrigin(origin: string, url: string): boolean {
  try { return new URL(url).origin === origin; } catch { return false; }
}
