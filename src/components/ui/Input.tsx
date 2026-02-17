"use client";
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label className="text-bb-sm font-medium text-bb-muted">{label}</label>
                )}
                <input
                    ref={ref}
                    className={`bb-input ${error ? 'border-bb-error' : ''} ${className}`}
                    {...props}
                />
                {error && (
                    <span className="text-bb-xs text-bb-error">{error}</span>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';
