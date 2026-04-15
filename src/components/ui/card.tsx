interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  const interactive = !!onClick;

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (interactive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick!();
    }
  }

  return (
    <div
      className={`bg-[var(--surface)] rounded-card shadow-card border border-[var(--border)] p-5 transition-colors ${
        interactive ? "tap-press cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      {children}
    </div>
  );
}
