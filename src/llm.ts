import { Ai } from "@cloudflare/ai";

const SYSTEM_PROMPT = `You are a concise, helpful assistant. Keep answers short unless more detail is requested. If code is shown, ensure it runs. Avoid speculation. Be kind.`;
export async function runLLM(
  env: any,
  messages: { role: string; content: string }[],
  model?: string
) {
  try {
    if (!env?.AI) throw new Error("no-ai-binding");
    const ai = new Ai(env.AI);
    const chosen = model || env.MODEL || "@cf/meta/llama-3.3-8b-instruct";
    const result = await ai.run(chosen, {
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    });
    const textOut = ((result as any)?.response || (result as any)?.result || "").toString();
    return textOut;
  } catch (err) {
    const last = messages.length ? messages[messages.length - 1].content : "hello";
    return `Mock reply (dev): I received: ${last}`;
  }
}

export async function summarize(env: any, text: string) {
  try {
    if (!env?.AI) throw new Error("no-ai-binding");
    const ai = new Ai(env.AI);
    const model = env.MODEL || "@cf/meta/llama-3.3-8b-instruct";
    const prompt = `Summarize the following conversation in <=120 words, preserving key facts and user preferences.\n\n${text}`;
  const result = await ai.run(model, { prompt });
  const textOut = ((result as any)?.response || (result as any)?.result || "").toString();
  return textOut;
  } catch (err) {
    const truncated = text.split("\n").slice(-10).join(" \n ");
    return `Mock summary (dev): ${truncated.slice(0, 120)}`;
  }
}
