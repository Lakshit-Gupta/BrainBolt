"use client";

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'error' | 'warning' | 'accent';
    className?: string;
}

const variantClasses = {
    default: 'bg-bb-elevated text-bb-muted border border-bb-border',
    success: 'bg-green-900/50 text-bb-success border border-green-800',
    error: 'bg-red-900/50 text-bb-error border border-red-800',
    warning: 'bg-amber-900/50 text-amber-400 border border-amber-800',
    accent: 'bg-indigo-900/50 text-bb-accent border border-indigo-700',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    return (
        <span className={`bb-badge ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
}
