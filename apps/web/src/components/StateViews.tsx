import { AlertCircle, Loader2 } from "lucide-react";
import { Panel } from "./Panel";

export function LoadingState({ text = "Загрузка..." }: { text?: string }) {
  return (
    <Panel className="flex items-center gap-3 text-tg-hint">
      <Loader2 className="animate-spin" size={18} />
      <span>{text}</span>
    </Panel>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Panel className="flex items-start gap-3 text-red-200">
      <AlertCircle className="mt-0.5" size={18} />
      <span>{message}</span>
    </Panel>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Panel>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-tg-hint">{text}</p>
    </Panel>
  );
}
