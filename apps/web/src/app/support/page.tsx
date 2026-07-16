"use client";

import { HelpCircle, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

const faq = [
  {
    title: "How is Stars price calculated?",
    text: "Stars are calculated from 1.4 RUB per Star and shown in RUB and USD. Minimum order is 50 Stars. Service fee is added only when enabled in pricing config.",
  },
  {
    title: "Which payment methods are available?",
    text: "You can pay with Crypto Bot invoices or by manual wallet transfer. Crypto Bot is confirmed by webhook; wallet transfer is confirmed by admin.",
  },
  {
    title: "Why is fulfillment manual?",
    text: "Stars and Premium delivery is handled by admin after payment confirmation. The app does not imitate unofficial Telegram delivery APIs.",
  },
  {
    title: "Where can I track status?",
    text: "Order status is available in order history. Wallet transfers can show Admin check until manual verification is complete.",
  },
];

export default function SupportPage() {
  return (
    <AppShell title="FAQ">
      <Panel>
        <div className="flex items-center gap-3">
          <HelpCircle className="text-tg-link" size={22} />
          <h2 className="font-semibold">Questions</h2>
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
            <h2 className="font-semibold">Support</h2>
            <p className="mt-1 text-sm text-tg-hint">Contact support from the bot and include your order number.</p>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
