interface SkeletonProps {
  className?: string;
  isDark?: boolean;
}

export function Skeleton({ className = '', isDark = false }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} ${className}`}
    />
  );
}

interface CardSkeletonProps {
  isDark?: boolean;
}

export function CardSkeleton({ isDark = false }: CardSkeletonProps) {
  return (
    <div className={`rounded-lg shadow-sm p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <Skeleton className="h-5 w-3/4 mb-2" isDark={isDark} />
      <Skeleton className="h-4 w-1/2 mb-3" isDark={isDark} />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12 rounded-full" isDark={isDark} />
        <Skeleton className="h-5 w-16 rounded-full" isDark={isDark} />
      </div>
    </div>
  );
}

interface StatSkeletonProps {
  isDark?: boolean;
}

export function StatSkeleton({ isDark = false }: StatSkeletonProps) {
  return (
    <div className={`rounded-xl p-4 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <Skeleton className="h-4 w-20 mb-2" isDark={isDark} />
      <Skeleton className="h-8 w-16" isDark={isDark} />
    </div>
  );
}

interface LibrarySkeletonProps {
  isDark?: boolean;
  count?: number;
}

export function LibrarySkeleton({ isDark = false, count = 5 }: LibrarySkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} isDark={isDark} />
      ))}
    </div>
  );
}

interface StatsSkeletonProps {
  isDark?: boolean;
}

export function StatsSkeleton({ isDark = false }: StatsSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatSkeleton isDark={isDark} />
      <StatSkeleton isDark={isDark} />
      <StatSkeleton isDark={isDark} />
      <StatSkeleton isDark={isDark} />
      <div className={`rounded-xl p-4 shadow-sm col-span-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <Skeleton className="h-4 w-32 mb-2" isDark={isDark} />
        <Skeleton className="h-8 w-24" isDark={isDark} />
      </div>
    </div>
  );
}
