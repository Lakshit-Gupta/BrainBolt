"use client";
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

const variantClasses = {
    primary: 'bb-btn-primary',
    secondary: 'bg-bb-elevated border border-bb-border text-bb-text hover:border-bb-accent rounded-bb-md px-4 py-2 font-medium transition-colors cursor-pointer',
    ghost: 'bg-transparent text-bb-muted hover:text-bb-text rounded-bb-md px-4 py-2 transition-colors cursor-pointer',
    danger: 'bg-bb-error text-white rounded-bb-md px-4 py-2 font-medium hover:opacity-90 transition-opacity cursor-pointer',
};

const sizeClasses = {
    sm: 'text-bb-sm px-3 py-1.5',
    md: 'text-bb-base px-4 py-2',
    lg: 'text-bb-lg px-6 py-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {children}
                    </span>
                ) : children}
            </button>
        );
    }
);
Button.displayName = 'Button';
