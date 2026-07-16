import { env, adminTelegramIds } from "../config/env.js";

type MessageTarget = string | bigint;

type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type TelegramReplyMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

async function sendTelegramMessage(chatId: MessageTarget, text: string, replyMarkup?: TelegramReplyMarkup) {
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.toString(),
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Telegram notification failed: ${response.status} ${body}`);
  }
}

export async function notifyUser(chatId: MessageTarget, text: string, replyMarkup?: TelegramReplyMarkup) {
  await sendTelegramMessage(chatId, text, replyMarkup);
}

export async function notifyAdmins(text: string, replyMarkup?: TelegramReplyMarkup) {
  await Promise.all(adminTelegramIds.map((id) => sendTelegramMessage(id, text, replyMarkup)));
}
