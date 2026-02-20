import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number;
  variant: 'positive' | 'negative' | 'warning' | 'neutral';
  icon?: LucideIcon;
  subtitle?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  variant,
  icon: Icon,
  subtitle,
  onClick,
}) => {
  const valueClasses = {
    positive: 'kpi-value-positive',
    negative: 'kpi-value-negative',
    warning: 'kpi-value-warning',
    neutral: 'text-gray-900 font-bold',
  };

  const iconBgClasses = {
    positive: 'bg-success/10 text-success',
    negative: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    neutral: 'bg-primary/10 text-primary',
  };

  return (
    <div 
      className={cn(
        "kpi-card animate-fade-in",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {title}
          </p>
          <p className={cn('text-4xl tracking-tight', valueClasses[variant])}>
            {value.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-600 mt-2">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-lg', iconBgClasses[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      {onClick && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs text-primary font-medium">Click to view details →</span>
        </div>
      )}
    </div>
  );
};
