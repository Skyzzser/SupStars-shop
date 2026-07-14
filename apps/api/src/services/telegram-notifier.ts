import { env, adminTelegramIds } from "../config/env.js";

type MessageTarget = string | bigint;

async function sendTelegramMessage(chatId: MessageTarget, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.toString(),
      text,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Telegram notification failed: ${response.status} ${body}`);
  }
}

export async function notifyUser(chatId: MessageTarget, text: string) {
  await sendTelegramMessage(chatId, text);
}

export async function notifyAdmins(text: string) {
  await Promise.all(adminTelegramIds.map((id) => sendTelegramMessage(id, text)));
}
