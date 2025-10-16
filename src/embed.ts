import { Ai } from "@cloudflare/ai";

export async function embed(env: any, texts: string[]): Promise<number[][]> {
  const ai = new Ai(env.AI);
  const model = "@cf/baai/bge-base-en-v1.5";
  const { data } = await ai.run(model, { text: texts });
  return data as number[][];
}