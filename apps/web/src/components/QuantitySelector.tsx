"use client";

import { STARS_PRESETS } from "@suupstars/shared";
import { clsx } from "clsx";

export function QuantitySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {STARS_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={clsx(
              "min-h-10 rounded-md border px-2 text-sm font-semibold",
              value === preset
                ? "border-tg-button bg-tg-button text-tg-buttonText"
                : "border-tg-border bg-black/20 text-tg-text",
            )}
          >
            {preset}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-2 block text-sm text-tg-hint">Свое количество</span>
        <input
          min={50}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-12 w-full rounded-md border border-tg-border bg-black/20 px-3 text-base outline-none focus:border-tg-button"
        />
      </label>
    </div>
  );
}
