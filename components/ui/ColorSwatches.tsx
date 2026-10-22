"use client";

import { Check } from "lucide-react";
import { PROJECT_COLORS } from "@/lib/constants";

export default function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
      {PROJECT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className="flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110 aria-checked:ring-2"
          style={{ background: c, ["--tw-ring-color" as string]: c }}
        >
          {value === c && <Check className="h-3.5 w-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}
