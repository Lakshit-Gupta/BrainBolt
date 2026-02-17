export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-bb-elevated rounded-bb-md ${className}`} />
    );
}

export function SkeletonCard() {
    return (
        <div className="bb-card space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <div className="grid grid-cols-2 gap-3 mt-6">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                ))}
            </div>
        </div>
    );
}
