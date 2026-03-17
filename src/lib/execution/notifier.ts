/**
 * Pipeline Execution Notifier
 *
 * Sends notifications to Telegram/Feishu when pipeline events occur:
 * - Stage completed
 * - Checkpoint pending (needs human approval)
 * - Pipeline completed or errored
 *
 * Uses the Dashboard API to send messages through configured bots.
 */

export type NotifyChannel = "telegram" | "feishu" | "both";

export interface NotifierConfig {
  enabled: boolean;
  channel: NotifyChannel;
  /** Telegram chat ID */
  telegramChatId?: string;
  /** Feishu chat ID */
  feishuChatId?: string;
  /** Only notify on these events (default: all) */
  events?: ("node-done" | "checkpoint" | "pipeline-done" | "pipeline-error")[];
}

export type NotifyEventType =
  | "node-done"
  | "checkpoint"
  | "pipeline-done"
  | "pipeline-error";

interface NotifyPayload {
  type: NotifyEventType;
  pipelineName: string;
  nodeName?: string;
  message: string;
  /** For checkpoint events: URL to approve in dashboard */
  dashboardUrl?: string;
}

const EMOJI: Record<NotifyEventType, string> = {
  "node-done": "\u2705",     // green check
  "checkpoint": "\u23f8\ufe0f", // pause
  "pipeline-done": "\ud83c\udf89", // tada
  "pipeline-error": "\u274c",  // cross mark
};

function formatMessage(payload: NotifyPayload): string {
  const emoji = EMOJI[payload.type] ?? "";
  const lines: string[] = [];

  switch (payload.type) {
    case "node-done":
      lines.push(`${emoji} Stage Completed: ${payload.nodeName}`);
      lines.push(`Pipeline: ${payload.pipelineName}`);
      if (payload.message) lines.push(payload.message);
      break;
    case "checkpoint":
      lines.push(`${emoji} Checkpoint — Approval Required`);
      lines.push(`Pipeline: ${payload.pipelineName}`);
      lines.push(`Stage: ${payload.nodeName}`);
      lines.push("");
      lines.push("Open Dashboard to approve or reject.");
      if (payload.dashboardUrl) lines.push(payload.dashboardUrl);
      break;
    case "pipeline-done":
      lines.push(`${emoji} Pipeline Completed`);
      lines.push(`Pipeline: ${payload.pipelineName}`);
      if (payload.message) lines.push(payload.message);
      break;
    case "pipeline-error":
      lines.push(`${emoji} Pipeline Error`);
      lines.push(`Pipeline: ${payload.pipelineName}`);
      if (payload.message) lines.push(payload.message);
      break;
  }

  return lines.join("\n");
}

async function sendToTelegram(
  chatId: string,
  text: string
): Promise<void> {
  try {
    await fetch("/api/bot/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        chatId,
        text,
      }),
    });
  } catch (err) {
    console.error("[Notifier] Telegram send failed:", err);
  }
}

async function sendToFeishu(
  chatId: string,
  text: string
): Promise<void> {
  try {
    await fetch("/api/bot/feishu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        chatId,
        text,
      }),
    });
  } catch (err) {
    console.error("[Notifier] Feishu send failed:", err);
  }
}

/**
 * Send a pipeline notification through configured channels.
 */
export async function notify(
  config: NotifierConfig,
  payload: NotifyPayload
): Promise<void> {
  if (!config.enabled) return;

  // Check if this event type should be notified
  if (config.events && config.events.length > 0) {
    if (!config.events.includes(payload.type)) return;
  }

  const text = formatMessage(payload);

  const promises: Promise<void>[] = [];

  if (
    (config.channel === "telegram" || config.channel === "both") &&
    config.telegramChatId
  ) {
    promises.push(sendToTelegram(config.telegramChatId, text));
  }

  if (
    (config.channel === "feishu" || config.channel === "both") &&
    config.feishuChatId
  ) {
    promises.push(sendToFeishu(config.feishuChatId, text));
  }

  await Promise.allSettled(promises);
}

/**
 * Create a notifier instance bound to a pipeline.
 * Returns a function that can be called with just event type and node name.
 */
export function createPipelineNotifier(
  config: NotifierConfig,
  pipelineName: string,
  dashboardUrl?: string
) {
  return async (
    type: NotifyEventType,
    nodeName?: string,
    message?: string
  ): Promise<void> => {
    await notify(config, {
      type,
      pipelineName,
      nodeName,
      message: message ?? "",
      dashboardUrl,
    });
  };
}
