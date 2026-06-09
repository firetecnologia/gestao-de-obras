'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'success' | 'danger' | 'warning' | 'gold';
}

const colorMap = {
  default: 'text-[var(--color-primary)]',
  success: 'text-[var(--color-success)]',
  danger: 'text-[var(--color-danger)]',
  warning: 'text-[var(--color-warning)]',
  gold: 'text-[var(--color-gold)]',
};

export function KPICard({ label, value, sublabel, trend, color = 'default' }: KPICardProps) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-xl font-bold ${colorMap[color]}`}>{value}</span>
      {sublabel && (
        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
          {trend === 'up' && <span className="text-[var(--color-success)]">▲</span>}
          {trend === 'down' && <span className="text-[var(--color-danger)]">▼</span>}
          {sublabel}
        </span>
      )}
    </Card>
  );
}
