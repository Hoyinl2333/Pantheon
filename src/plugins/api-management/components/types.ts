export interface ApiKeyRecord {
  id: string;
  provider: string;
  name: string;
  key_masked: string;
  base_url: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  usage_count: number;
  monthly_budget: number | null;
  notes: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  prefix: string;
  defaultBaseUrl: string;
}

export interface ModelInfo {
  id: string;
  ownedBy?: string;
  created?: number;
}

export interface CheckResult {
  valid: boolean;
  balance: { amount: number; currency: string } | null;
  models: ModelInfo[];
  usage: { used: number; limit: number } | null;
  error?: string;
  checkedAt: string;
}

export const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  openai: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  deepseek: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  siliconflow: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  moonshot: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  zhipu: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  openrouter: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  groq: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  together: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  google: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  mistral: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  cohere: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  volcengine: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  baidu: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export const CHART_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f472b6", "#10b981", "#a78bfa", "#34d399",
  "#e879f9", "#fb923c", "#38bdf8", "#4ade80", "#c084fc",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Claude: "#f97316",
  GPT: "#22c55e",
  Gemini: "#3b82f6",
  DeepSeek: "#6366f1",
  Qwen: "#8b5cf6",
  Llama: "#06b6d4",
  Mistral: "#f59e0b",
  Moonshot: "#a855f7",
  GLM: "#ef4444",
  Yi: "#14b8a6",
  InternLM: "#ec4899",
  Cohere: "#10b981",
  Other: "#6b7280",
};

export function getProviderColor(providerId: string): string {
  return PROVIDER_COLORS[providerId] ?? PROVIDER_COLORS.custom;
}

export function formatDate(dateStr: string | null, neverLabel: string): string {
  if (!dateStr) return neverLabel;
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "CNY" ? "\u00a5" : "$";
  return `${symbol}${amount.toFixed(2)}`;
}

export function categorizeModel(id: string): string {
  const lower = id.toLowerCase();
  if (lower.includes("claude")) return "Claude";
  if (lower.includes("gpt") || lower.includes("o1") || lower.includes("o3") || lower.includes("o4") || lower.includes("chatgpt") || lower.includes("codex")) return "GPT";
  if (lower.includes("gemini") || lower.includes("gemma")) return "Gemini";
  if (lower.includes("deepseek")) return "DeepSeek";
  if (lower.includes("qwen") || lower.includes("tongyi")) return "Qwen";
  if (lower.includes("llama") || lower.includes("meta")) return "Llama";
  if (lower.includes("mistral") || lower.includes("mixtral")) return "Mistral";
  if (lower.includes("moonshot") || lower.includes("kimi")) return "Moonshot";
  if (lower.includes("glm") || lower.includes("zhipu") || lower.includes("chatglm")) return "GLM";
  if (lower.includes("yi-")) return "Yi";
  if (lower.includes("internlm")) return "InternLM";
  if (lower.includes("command") || lower.includes("cohere")) return "Cohere";
  return "Other";
}
