"use client";

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'error' | 'warning' | 'accent';
    className?: string;
}

const variantClasses = {
    default: 'bg-bb-elevated text-bb-muted border border-bb-border',
    success: 'bb-success-subtle text-bb-success',
    error: 'bb-error-subtle text-bb-error',
    warning: 'bb-warning-subtle text-amber-400',
    accent: 'bb-accent-subtle text-bb-accent',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    return (
        <span className={`bb-badge ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
}
