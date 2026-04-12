interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
}

export function Toggle({ checked, onChange, size = "md" }: ToggleProps) {
  const sizeClass = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`${sizeClass} rounded-lg border-2 flex items-center justify-center transition-all ${
        checked
          ? "bg-sage-200 border-sage-300 text-sage-600"
          : "bg-warm-50 border-warm-200 text-transparent"
      }`}
    >
      {checked && <span className="text-sm">✓</span>}
    </button>
  );
}
