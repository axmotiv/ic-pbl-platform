interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`bg-white/40 animate-pulse rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-3xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/30" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/40 rounded-lg w-3/4" />
        <div className="h-3 bg-white/30 rounded-lg w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-white/30 rounded-full w-14" />
          <div className="h-5 bg-white/30 rounded-full w-10" />
        </div>
        <div className="flex justify-between">
          <div className="h-3 bg-white/30 rounded w-20" />
          <div className="h-5 w-5 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
