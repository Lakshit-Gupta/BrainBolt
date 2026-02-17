"use client";
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    elevated?: boolean;
}

export function Card({ children, className = '', elevated = false, ...props }: CardProps) {
    return (
        <div
            className={`bb-card ${elevated ? 'shadow-bb-elevated' : 'shadow-bb-card'} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`mb-4 ${className}`} {...props}>{children}</div>
    );
}

export function CardTitle({ children, className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h2 className={`text-bb-xl font-semibold text-bb-text ${className}`} {...props}>{children}</h2>
    );
}
