interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-card shadow-card p-5 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
