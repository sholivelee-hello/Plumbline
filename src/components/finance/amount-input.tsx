"use client";

import { formatCurrencyInput, parseCurrencyInput } from "@/lib/finance-utils";

interface AmountInputProps {
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
}

const QUICK_UNITS = [
  { label: "+1만", amount: 10_000 },
  { label: "+5만", amount: 50_000 },
  { label: "+10만", amount: 100_000 },
  { label: "+50만", amount: 500_000 },
];

export function AmountInput({
  value,
  onChange,
  placeholder = "금액",
  autoFocus = false,
  disabled = false,
  error,
}: AmountInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatCurrencyInput(e.target.value));
  }

  function handleQuickUnit(amount: number) {
    const current = parseCurrencyInput(value);
    onChange(formatCurrencyInput(String(current + amount)));
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={[
          "w-full min-h-[44px] px-4 py-2.5 rounded-xl text-right text-lg font-semibold tabular-nums",
          "border bg-white dark:bg-[#1a2030] text-gray-900 dark:text-gray-100",
          "focus:outline-none focus:ring-2 focus:ring-primary-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-red-400 dark:border-red-500 animate-shake"
            : "border-gray-200 dark:border-[#2d3748]",
        ]
          .filter(Boolean)
          .join(" ")}
      />

      <div className="flex gap-2">
        {QUICK_UNITS.map(({ label, amount }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => handleQuickUnit(amount)}
            className="flex-1 min-h-[44px] rounded-xl text-sm font-medium
              bg-gray-100 dark:bg-[#262c38] text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-[#2d3748]
              active:scale-[0.97] transition-transform
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
