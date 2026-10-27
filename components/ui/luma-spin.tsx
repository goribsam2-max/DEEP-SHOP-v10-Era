import React from "react";

export const LumaSpin: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <div className="ds-skeleton h-7 w-44 rounded-xl" />
        <div className="ds-skeleton h-9 w-24 rounded-full" />
      </div>
      <div className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="ds-skeleton w-12 h-12 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="ds-skeleton h-4 w-2/3 rounded-md" />
            <div className="ds-skeleton h-3 w-1/3 rounded-md" />
          </div>
        </div>
        <div className="ds-skeleton h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="ds-skeleton h-10 rounded-full" />
          <div className="ds-skeleton h-10 rounded-full" />
        </div>
      </div>
    </div>
  );
};
