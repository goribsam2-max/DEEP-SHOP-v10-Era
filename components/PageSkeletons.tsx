import React from 'react';

const Bone: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`ds-skeleton rounded-xl ${className}`} aria-hidden="true" />
);

export const StoryRowSkeleton: React.FC<{ count?: number }> = ({ count = 7 }) => (
  <div className="flex items-center gap-3.5 overflow-hidden py-3 px-1">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="flex flex-col items-center gap-2 shrink-0">
        <Bone className="w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full" />
        <Bone className="h-2.5 w-14 rounded-md" />
      </div>
    ))}
  </div>
);

export const ProductGridSkeleton: React.FC<{ count?: number; columnsClass?: string }> = ({
  count = 8,
  columnsClass = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}) => (
  <div className={`grid ${columnsClass} gap-3.5 sm:gap-5`}>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-2.5 sm:p-3.5 flex flex-col gap-3"
      >
        <Bone className="aspect-[4/4] w-full rounded-xl" />
        <div className="space-y-2 px-0.5">
          <Bone className="h-3 w-1/3 rounded-md" />
          <Bone className="h-4 w-11/12 rounded-md" />
          <Bone className="h-4 w-2/3 rounded-md" />
          <div className="flex items-center justify-between pt-1.5">
            <Bone className="h-5 w-20 rounded-md" />
            <Bone className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SectionShowcaseSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <section className="space-y-4 py-3">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Bone className="h-6 w-44 sm:w-56 rounded-lg" />
        <Bone className="h-3.5 w-64 rounded-md" />
      </div>
      <Bone className="h-9 w-24 rounded-full" />
    </div>
    <ProductGridSkeleton count={cards} />
  </section>
);

export const NewsPostCardSkeleton: React.FC<{ count?: number; withMedia?: boolean }> = ({
  count = 3,
  withMedia = true,
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Bone className="h-3.5 w-32 rounded-md" />
              <Bone className="h-2.5 w-20 rounded-md" />
            </div>
          </div>
          <Bone className="w-7 h-7 rounded-full" />
        </div>
        <div className="space-y-2">
          <Bone className="h-3.5 w-full rounded-md" />
          <Bone className="h-3.5 w-11/12 rounded-md" />
          <Bone className="h-3.5 w-3/5 rounded-md" />
        </div>
        {withMedia && idx % 2 === 0 && (
          <Bone className="w-full h-56 sm:h-64 rounded-2xl" />
        )}
        <div className="flex items-center gap-5 pt-1">
          <Bone className="h-7 w-14 rounded-full" />
          <Bone className="h-7 w-14 rounded-full" />
          <Bone className="h-7 w-14 rounded-full" />
          <Bone className="h-7 w-10 rounded-full ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

export const CommentListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4 py-2">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="flex items-start gap-3">
        <Bone className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Bone className="h-3.5 w-28 rounded-md" />
            <Bone className="h-2.5 w-12 rounded-md" />
          </div>
          <Bone className="h-3.5 w-full rounded-md" />
          <Bone className="h-3.5 w-3/4 rounded-md" />
          <div className="flex items-center gap-4 pt-1">
            <Bone className="h-4 w-10 rounded-md" />
            <Bone className="h-4 w-10 rounded-md" />
            <Bone className="h-4 w-10 rounded-md" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const AdminTableSkeleton: React.FC<{ rows?: number; showStats?: boolean }> = ({
  rows = 6,
  showStats = true,
}) => (
  <div className="w-full space-y-6 py-2">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="space-y-2">
        <Bone className="h-7 w-52 rounded-lg" />
        <Bone className="h-3.5 w-72 rounded-md" />
      </div>
      <div className="flex items-center gap-2.5">
        <Bone className="h-10 w-36 rounded-xl" />
        <Bone className="h-10 w-28 rounded-xl" />
      </div>
    </div>

    {showStats && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Bone className="h-3.5 w-24 rounded-md" />
              <Bone className="w-9 h-9 rounded-xl" />
            </div>
            <Bone className="h-7 w-28 rounded-lg" />
            <Bone className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>
    )}

    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <Bone className="h-10 w-64 rounded-xl" />
        <div className="flex items-center gap-2">
          <Bone className="h-9 w-24 rounded-lg" />
          <Bone className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="p-4 flex items-center gap-4">
            <Bone className="w-11 h-11 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Bone className="h-4 w-48 max-w-full rounded-md" />
              <Bone className="h-3 w-32 rounded-md" />
            </div>
            <Bone className="hidden sm:block h-6 w-20 rounded-full" />
            <Bone className="h-5 w-16 rounded-md" />
            <Bone className="h-9 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const HomePageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 space-y-6">
    <StoryRowSkeleton count={8} />
    <Bone className="w-full h-48 sm:h-72 lg:h-80 rounded-3xl" />
    <div className="flex items-center gap-2.5 overflow-hidden py-1">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Bone key={idx} className="h-9 w-28 rounded-full shrink-0" />
      ))}
    </div>
    <SectionShowcaseSkeleton cards={8} />
    <SectionShowcaseSkeleton cards={4} />
  </div>
);

export const CatalogPageSkeleton: React.FC<{ titleWidth?: string }> = () => (
  <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-2">
        <Bone className="h-7 w-48 rounded-lg" />
        <Bone className="h-3.5 w-64 rounded-md" />
      </div>
      <div className="flex items-center gap-2.5">
        <Bone className="h-10 w-44 rounded-xl" />
        <Bone className="h-10 w-28 rounded-xl" />
      </div>
    </div>
    <div className="flex items-center gap-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Bone key={idx} className="h-8 w-24 rounded-full shrink-0" />
      ))}
    </div>
    <ProductGridSkeleton count={8} />
  </div>
);

export const ProductDetailsPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
      <div className="lg:col-span-6 space-y-3.5">
        <Bone className="aspect-square w-full rounded-3xl" />
        <div className="grid grid-cols-5 gap-2.5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Bone key={idx} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
      <div className="lg:col-span-6 space-y-5">
        <Bone className="h-4 w-28 rounded-md" />
        <Bone className="h-8 w-11/12 rounded-lg" />
        <Bone className="h-6 w-2/3 rounded-lg" />
        <div className="flex items-center gap-3">
          <Bone className="h-9 w-36 rounded-xl" />
          <Bone className="h-6 w-20 rounded-md" />
        </div>
        <div className="space-y-2.5 pt-2">
          <Bone className="h-3.5 w-full rounded-md" />
          <Bone className="h-3.5 w-11/12 rounded-md" />
          <Bone className="h-3.5 w-4/5 rounded-md" />
        </div>
        <div className="grid grid-cols-4 gap-2.5 pt-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Bone key={idx} className="h-11 rounded-xl" />
          ))}
        </div>
        <div className="flex items-center gap-3 pt-3">
          <Bone className="h-12 flex-1 rounded-full" />
          <Bone className="h-12 flex-1 rounded-full" />
        </div>
      </div>
    </div>
    <SectionShowcaseSkeleton cards={4} />
  </div>
);

export const StoreProfilePageSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-6">
    <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-hidden">
      <Bone className="w-full h-40 sm:h-56 rounded-none" />
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 relative">
        <div className="flex items-end gap-4">
          <Bone className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white dark:border-zinc-900" />
          <div className="space-y-2 pb-1">
            <Bone className="h-6 w-44 rounded-lg" />
            <Bone className="h-3.5 w-32 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Bone className="h-10 w-28 rounded-full" />
          <Bone className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>
    <ProductGridSkeleton count={8} />
  </div>
);

export const CartCheckoutPageSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
    <div className="lg:col-span-7 space-y-4">
      <Bone className="h-7 w-48 rounded-lg" />
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 flex items-center gap-4"
        >
          <Bone className="w-20 h-20 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/4 rounded-md" />
            <Bone className="h-3.5 w-1/3 rounded-md" />
            <Bone className="h-5 w-24 rounded-md" />
          </div>
          <Bone className="h-9 w-24 rounded-full" />
        </div>
      ))}
    </div>
    <div className="lg:col-span-5">
      <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <Bone className="h-6 w-40 rounded-lg" />
        <Bone className="h-11 w-full rounded-xl" />
        <Bone className="h-11 w-full rounded-xl" />
        <div className="space-y-2.5 pt-2">
          <div className="flex justify-between">
            <Bone className="h-3.5 w-24 rounded-md" />
            <Bone className="h-3.5 w-16 rounded-md" />
          </div>
          <div className="flex justify-between">
            <Bone className="h-3.5 w-28 rounded-md" />
            <Bone className="h-3.5 w-16 rounded-md" />
          </div>
          <div className="flex justify-between pt-2">
            <Bone className="h-5 w-24 rounded-md" />
            <Bone className="h-5 w-24 rounded-md" />
          </div>
        </div>
        <Bone className="h-12 w-full rounded-full" />
      </div>
    </div>
  </div>
);

export const OrdersPageSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
    <div className="flex items-center justify-between">
      <Bone className="h-7 w-44 rounded-lg" />
      <Bone className="h-9 w-32 rounded-full" />
    </div>
    <div className="flex items-center gap-2 overflow-hidden py-1">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Bone key={idx} className="h-9 w-24 rounded-full shrink-0" />
      ))}
    </div>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <Bone className="h-4 w-36 rounded-md" />
          <Bone className="h-6 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Bone className="w-16 h-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-2/3 rounded-md" />
            <Bone className="h-3.5 w-1/3 rounded-md" />
          </div>
          <Bone className="h-5 w-20 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

export const OrderDetailPageSkeleton: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
    <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-6 w-48 rounded-lg" />
          <Bone className="h-3.5 w-32 rounded-md" />
        </div>
        <Bone className="h-8 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-2 pt-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Bone key={idx} className="h-2 rounded-full" />
        ))}
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <Bone className="h-4 w-36 rounded-md" />
            <Bone className="h-4 w-24 rounded-md" />
          </div>
        ))}
      </div>
      <Bone className="h-12 w-full rounded-full" />
    </div>
  </div>
);

export const NewsFeedPageSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto px-3.5 sm:px-5 py-4 space-y-4">
    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 flex items-center gap-3">
      <Bone className="w-10 h-10 rounded-full shrink-0" />
      <Bone className="h-10 flex-1 rounded-full" />
      <Bone className="h-9 w-20 rounded-full" />
    </div>
    <NewsPostCardSkeleton count={4} />
  </div>
);

export const NewsPostDetailPageSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
    <div className="flex items-center gap-3">
      <Bone className="w-9 h-9 rounded-full" />
      <Bone className="h-5 w-28 rounded-md" />
    </div>
    <NewsPostCardSkeleton count={1} withMedia />
    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4">
      <CommentListSkeleton count={4} />
    </div>
  </div>
);

export const NewsProfilePageSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
    <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Bone className="h-7 w-44 rounded-lg" />
          <Bone className="h-4 w-28 rounded-md" />
          <Bone className="h-3.5 w-3/4 rounded-md" />
        </div>
        <Bone className="w-20 h-20 rounded-full shrink-0" />
      </div>
      <div className="flex items-center gap-3">
        <Bone className="h-10 flex-1 rounded-full" />
        <Bone className="h-10 flex-1 rounded-full" />
      </div>
    </div>
    <NewsPostCardSkeleton count={3} />
  </div>
);

export const MessagesPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto h-[calc(100vh-5rem)] px-2 sm:px-4 py-3 grid grid-cols-1 md:grid-cols-12 gap-3">
    <div className="md:col-span-4 rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <Bone className="h-6 w-32 rounded-lg" />
        <Bone className="w-9 h-9 rounded-full" />
      </div>
      <Bone className="h-10 w-full rounded-full" />
      <StoryRowSkeleton count={5} />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <Bone className="w-12 h-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-4 w-32 rounded-md" />
              <Bone className="h-3 w-44 rounded-md" />
            </div>
            <Bone className="h-3 w-10 rounded-md" />
          </div>
        ))}
      </div>
    </div>
    <div className="hidden md:flex md:col-span-8 rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Bone className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Bone className="h-4 w-36 rounded-md" />
            <Bone className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Bone className="w-9 h-9 rounded-full" />
          <Bone className="w-9 h-9 rounded-full" />
        </div>
      </div>
      <div className="space-y-4 py-6">
        <Bone className="h-12 w-64 rounded-2xl" />
        <Bone className="h-14 w-72 rounded-2xl ml-auto" />
        <Bone className="h-12 w-56 rounded-2xl" />
        <Bone className="h-16 w-80 rounded-2xl ml-auto" />
      </div>
      <Bone className="h-12 w-full rounded-full" />
    </div>
  </div>
);

export const NotificationsPageSkeleton: React.FC<{ count?: number }> = ({ count = 7 }) => (
  <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
    <div className="flex items-center justify-between">
      <Bone className="h-7 w-40 rounded-lg" />
      <Bone className="h-8 w-24 rounded-full" />
    </div>
    <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/70">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 flex items-center gap-3.5">
          <Bone className="w-11 h-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Bone className="h-3.5 w-4/5 rounded-md" />
            <Bone className="h-3 w-24 rounded-md" />
          </div>
          <Bone className="h-8 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

export const BlogListPageSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    <div className="space-y-2">
      <Bone className="h-8 w-52 rounded-lg" />
      <Bone className="h-4 w-80 max-w-full rounded-md" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-hidden"
        >
          <Bone className="aspect-[16/10] w-full rounded-none" />
          <div className="p-4 space-y-2.5">
            <Bone className="h-3 w-24 rounded-md" />
            <Bone className="h-5 w-11/12 rounded-md" />
            <Bone className="h-3.5 w-full rounded-md" />
            <Bone className="h-3.5 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const BlogDetailPageSkeleton: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
    <Bone className="h-4 w-28 rounded-md" />
    <Bone className="h-9 w-11/12 rounded-lg" />
    <div className="flex items-center gap-3">
      <Bone className="w-10 h-10 rounded-full" />
      <div className="space-y-1.5">
        <Bone className="h-3.5 w-32 rounded-md" />
        <Bone className="h-3 w-24 rounded-md" />
      </div>
    </div>
    <Bone className="w-full aspect-[16/9] rounded-3xl" />
    <div className="space-y-3 pt-2">
      {Array.from({ length: 7 }).map((_, idx) => (
        <Bone key={idx} className={`h-4 rounded-md ${idx % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  </div>
);

export const ProfileSettingsPageSkeleton: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
    <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 flex items-center gap-4">
      <Bone className="w-20 h-20 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <Bone className="h-6 w-44 rounded-lg" />
        <Bone className="h-4 w-56 max-w-full rounded-md" />
      </div>
    </div>
    <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <Bone className="h-3.5 w-28 rounded-md" />
          <Bone className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Bone className="h-12 w-full rounded-full mt-2" />
    </div>
  </div>
);

export const FormCardPageSkeleton: React.FC = () => (
  <div className="max-w-xl mx-auto px-4 py-8">
    <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 space-y-4">
      <Bone className="h-7 w-48 rounded-lg" />
      <Bone className="h-4 w-72 max-w-full rounded-md" />
      <div className="space-y-3 pt-2">
        <Bone className="h-12 w-full rounded-2xl" />
        <Bone className="h-12 w-full rounded-2xl" />
        <Bone className="h-24 w-full rounded-2xl" />
      </div>
      <Bone className="h-12 w-full rounded-full" />
    </div>
  </div>
);

export const AuthPageSkeleton: React.FC = () => (
  <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
    <div className="w-full max-w-md rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-6 sm:p-8 space-y-5">
      <div className="flex flex-col items-center gap-3">
        <Bone className="w-14 h-14 rounded-2xl" />
        <Bone className="h-6 w-48 rounded-lg" />
        <Bone className="h-3.5 w-64 rounded-md" />
      </div>
      <div className="space-y-3">
        <Bone className="h-12 w-full rounded-2xl" />
        <Bone className="h-12 w-full rounded-2xl" />
      </div>
      <Bone className="h-12 w-full rounded-full" />
      <Bone className="h-12 w-full rounded-full" />
    </div>
  </div>
);

export const SellerDashboardSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    <AdminTableSkeleton rows={6} showStats />
  </div>
);

export const RoutePageSkeleton: React.FC<{ pathname?: string }> = ({ pathname = '/' }) => {
  const path = pathname.toLowerCase();

  if (path === '/' || path === '/home') return <HomePageSkeleton />;
  if (path.startsWith('/product/')) return <ProductDetailsPageSkeleton />;
  if (path.startsWith('/store/')) return <StoreProfilePageSkeleton />;
  if (
    path.startsWith('/all-products') ||
    path.startsWith('/flash-sale') ||
    path.startsWith('/bonus-products') ||
    path.startsWith('/bundle') ||
    path.startsWith('/search') ||
    path.startsWith('/wishlist') ||
    path.startsWith('/category')
  ) {
    return <CatalogPageSkeleton />;
  }
  if (
    path.startsWith('/cart') ||
    path.startsWith('/checkout') ||
    path.startsWith('/payment') ||
    path.startsWith('/courier-payment') ||
    path.startsWith('/custom-pay') ||
    path.startsWith('/deposit') ||
    path.startsWith('/withdraw')
  ) {
    return <CartCheckoutPageSkeleton />;
  }
  if (path.startsWith('/my-orders')) return <OrdersPageSkeleton />;
  if (
    path.startsWith('/track-order') ||
    path.startsWith('/e-receipt') ||
    path.startsWith('/order-action') ||
    path.startsWith('/exchange-request') ||
    path.startsWith('/leave-review')
  ) {
    return <OrderDetailPageSkeleton />;
  }
  if (path.startsWith('/news/profile') || path.startsWith('/author/')) {
    return <NewsProfilePageSkeleton />;
  }
  if (path.startsWith('/news/') || path.startsWith('/post/')) {
    return <NewsPostDetailPageSkeleton />;
  }
  if (path.startsWith('/news')) return <NewsFeedPageSkeleton />;
  if (path.startsWith('/messages') || path.startsWith('/chat')) return <MessagesPageSkeleton />;
  if (path.startsWith('/notifications')) return <NotificationsPageSkeleton />;
  if (path.startsWith('/blog/')) return <BlogDetailPageSkeleton />;
  if (path.startsWith('/blog')) return <BlogListPageSkeleton />;
  if (path.startsWith('/admin')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <AdminTableSkeleton rows={6} showStats />
      </div>
    );
  }
  if (path.startsWith('/seller')) return <SellerDashboardSkeleton />;
  if (
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot') ||
    path.startsWith('/reset') ||
    path.startsWith('/auth') ||
    path.startsWith('/account-center')
  ) {
    return <AuthPageSkeleton />;
  }
  if (
    path.startsWith('/profile') ||
    path.startsWith('/edit-profile') ||
    path.startsWith('/shipping-address') ||
    path.startsWith('/affiliate') ||
    path.startsWith('/kyc') ||
    path.startsWith('/subscription') ||
    path.startsWith('/creator') ||
    path.startsWith('/sponsor') ||
    path.startsWith('/gift-stars')
  ) {
    return <ProfileSettingsPageSkeleton />;
  }

  return <CatalogPageSkeleton />;
};

export default RoutePageSkeleton;
