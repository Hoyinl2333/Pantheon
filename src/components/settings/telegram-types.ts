export interface BotStatus {
  configured: boolean;
  url: string | null;
  pendingUpdateCount?: number;
  lastErrorMessage?: string | null;
  error?: string;
}

export interface PollingStatus {
  polling: boolean;
  uptime: number | null;
}

export interface ApprovalStatus {
  available: boolean;
  chatId: string | null;
}

export interface EnvVar {
  value: string;
  masked: string;
  source: "env.local" | "process";
}

export type BotMode = "polling" | "webhook";
