import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`ds-skeleton rounded-lg ${className}`} aria-hidden="true" />;
};

export const ProductSkeleton: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-3 space-y-3">
      <Skeleton className="w-full aspect-[4/5] rounded-xl" />
      <div className="space-y-2 px-1 pb-1">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3.5 w-1/2 rounded-md" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const OrderSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 p-6 flex flex-col xl:flex-row gap-8 mb-4">
      <div className="xl:w-[320px] shrink-0 border-b xl:border-b-0 xl:border-r border-zinc-100 dark:border-zinc-800/80 pb-6 xl:pb-0 xl:pr-6">
        <div className="flex justify-between mb-6">
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <Skeleton className="h-6 w-1/4 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="h-3 w-full mt-2 rounded-md" />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex gap-4 mb-6">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
      <div className="xl:w-[200px] xl:text-right pt-6 xl:pt-0 border-t xl:border-t-0 xl:border-l border-zinc-100 dark:border-zinc-800/80 xl:pl-6">
        <Skeleton className="h-3 w-24 mb-2 xl:ml-auto rounded-md" />
        <Skeleton className="h-8 w-32 xl:ml-auto mb-6 rounded-md" />
        <Skeleton className="h-3 w-24 xl:ml-auto mb-1 rounded-md" />
        <Skeleton className="h-3 w-16 xl:ml-auto rounded-md" />
      </div>
    </div>
  );
};
