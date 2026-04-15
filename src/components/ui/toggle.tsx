interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}

export function Toggle({ checked, onChange, size = "md", ariaLabel }: ToggleProps) {
  const sizeClass = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={`${sizeClass} rounded-lg border-2 flex items-center justify-center transition-all tap-press ${
        checked
          ? "bg-primary-100 dark:bg-[#2a2e45] border-primary-300 dark:border-primary-500 text-primary-600 dark:text-primary-200 animate-check-bounce"
          : "bg-gray-50 dark:bg-[#1f242e] border-gray-200 dark:border-[#2a2e45] text-transparent"
      }`}
    >
      {checked && <span className="text-sm">✓</span>}
    </button>
  );
}
