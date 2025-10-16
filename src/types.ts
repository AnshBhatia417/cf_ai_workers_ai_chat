export type ChatRequest = {
  sessionId?: string;
  message: string;
};

export type ChatResponse = {
  sessionId: string;
  reply: string;
  tokens?: number;
};

export type Memory = {
  turns: { role: "user" | "assistant"; content: string; ts: number }[];
  summary?: string; 
  count: number;    
};
