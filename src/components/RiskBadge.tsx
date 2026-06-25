import { RiskLevel, getRiskColorClass } from '@/lib/risk';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export default function RiskBadge({ level, className }: RiskBadgeProps) {
  const colors = getRiskColorClass(level);
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors duration-200",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ backgroundColor: colors.hex }} />
      {level}
    </span>
  );
}
