interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`relative overflow-hidden bg-white/40 rounded-lg ${className}`}>
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      <div className="relative aspect-video bg-white/30 overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      <div className="p-4 space-y-3">
        <div className="relative overflow-hidden h-4 bg-white/40 rounded-lg w-3/4">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="relative overflow-hidden h-3 bg-white/30 rounded-lg w-1/2">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="relative overflow-hidden h-5 bg-white/30 rounded-full w-14">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="relative overflow-hidden h-5 bg-white/30 rounded-full w-10">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
        <div className="flex justify-between">
          <div className="relative overflow-hidden h-3 bg-white/30 rounded w-20">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="relative overflow-hidden h-5 w-5 bg-white/30 rounded-full">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
