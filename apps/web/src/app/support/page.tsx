"use client";

import { HelpCircle, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

const faq = [
  {
    title: "Как считается цена Stars?",
    text: "Количество умножается на 0.019 USD и на 1.5 RUB. Минимальный заказ — 50 Stars.",
  },
  {
    title: "Почему выдача ручная?",
    text: "Автоматическую покупку или выдачу Stars/Premium через неофициальные API не имитируем. Заказ обрабатывает администратор, а код оставляет место для будущего официального provider.",
  },
  {
    title: "Где смотреть статус?",
    text: "Все изменения доступны в истории заказа. Бот также отправляет уведомления о создании, смене статуса и завершении.",
  },
];

export default function SupportPage() {
  return (
    <AppShell title="FAQ">
      <Panel>
        <div className="flex items-center gap-3">
          <HelpCircle className="text-tg-link" size={22} />
          <h2 className="font-semibold">Частые вопросы</h2>
        </div>
        <div className="mt-4 space-y-4">
          {faq.map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-5 text-tg-hint">{item.text}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="flex items-center gap-3">
          <MessageCircle className="text-tg-link" size={22} />
          <div>
            <h2 className="font-semibold">Поддержка</h2>
            <p className="mt-1 text-sm text-tg-hint">Напишите администратору через кнопку поддержки в боте.</p>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
