"use client";

import { HelpCircle, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

const supportUrl = "https://t.me/SuupStarbot";

const faq = [
  {
    title: "Как считается цена Stars?",
    text: "Цена рассчитывается от 1.4 RUB за Star, минимум для заказа - 50 Stars. Сумма также показывается в USD.",
  },
  {
    title: "Какие способы оплаты доступны?",
    text: "Можно оплатить через счет Crypto Bot или переводом на кошелек. Crypto Bot подтверждается webhook-ом, перевод проверяет администратор.",
  },
  {
    title: "Когда выдадут Stars или Premium?",
    text: "После подтверждения оплаты заказ попадает в ручную выдачу. Статус можно отслеживать в разделе заказов.",
  },
  {
    title: "Куда писать, если что-то пошло не так?",
    text: "Напишите в поддержку @SuupStarbot и укажите номер заказа, чтобы мы быстрее нашли оплату.",
  },
];

export default function SupportPage() {
  return (
    <AppShell title="FAQ">
      <Panel className="p-5">
        <div className="flex items-center gap-3">
          <HelpCircle className="text-tg-link" size={22} />
          <h2 className="font-semibold">Вопросы и ответы</h2>
        </div>
        <div className="mt-5 space-y-4">
          {faq.map((item) => (
            <div key={item.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-5 text-tg-hint">{item.text}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-5">
        <div className="flex items-center gap-3">
          <MessageCircle className="text-tg-link" size={22} />
          <div>
            <h2 className="font-semibold">Поддержка</h2>
            <p className="mt-1 text-sm leading-5 text-tg-hint">Пишите в @SuupStarbot и прикладывайте номер заказа.</p>
          </div>
        </div>
        <a
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#34b7f1] to-[#69d6ff] px-5 text-sm font-semibold text-white"
        >
          Написать в поддержку
        </a>
      </Panel>
    </AppShell>
  );
}
