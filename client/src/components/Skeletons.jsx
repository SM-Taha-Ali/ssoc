import React from 'react';

/**
 * Modern, corporate-grade Skeleton loaders with pulse-and-shimmer animations
 * for Pipeline, Priority Inbox, Settings, and Lead Details.
 */

export function SettingsSkeleton() {
  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-canvas animate-in fade-in duration-200">
      {/* Left Sidebar Skeleton */}
      <aside className="w-64 h-full border-r border-theme bg-surface flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-theme flex items-center justify-between">
          <div className="h-4 w-32 rounded skeleton-shimmer" />
          <div className="h-6 w-14 rounded-lg skeleton-shimmer" />
        </div>
        <div className="p-3 space-y-2 flex-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-theme/40 bg-card-subtle/40">
              <div className="w-8 h-8 rounded-lg skeleton-shimmer flex-shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                <div className="h-2.5 w-36 rounded skeleton-shimmer opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Right Pane Content Skeleton */}
      <section className="flex-1 h-full min-w-0 flex flex-col bg-canvas">
        {/* Top Breadcrumb & Action Bar */}
        <div className="h-14 px-8 border-b border-theme bg-surface flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 rounded skeleton-shimmer" />
            <div className="h-3 w-3 rounded skeleton-shimmer opacity-40" />
            <div className="h-3.5 w-28 rounded skeleton-shimmer" />
          </div>
          <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
        </div>

        {/* Scrollable Form Body Skeleton */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Header Description */}
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg skeleton-shimmer" />
            <div className="h-3.5 w-3/4 rounded skeleton-shimmer opacity-70" />
          </div>

          {/* Quick AI Extraction Banner Skeleton */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg skeleton-shimmer flex-shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 rounded skeleton-shimmer" />
                <div className="h-3 w-64 rounded skeleton-shimmer opacity-70" />
              </div>
            </div>
            <div className="h-8 w-36 rounded-lg skeleton-shimmer flex-shrink-0" />
          </div>

          {/* Form Card 1 Skeleton */}
          <div className="p-6 rounded-2xl bg-card border border-theme space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-theme">
              <div className="w-5 h-5 rounded skeleton-shimmer" />
              <div className="h-4 w-44 rounded skeleton-shimmer" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-3 w-28 rounded skeleton-shimmer" />
                <div className="h-10 w-full rounded-xl skeleton-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-32 rounded skeleton-shimmer" />
                <div className="h-10 w-full rounded-xl skeleton-shimmer" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="h-3 w-24 rounded skeleton-shimmer" />
                <div className="h-10 w-full rounded-xl skeleton-shimmer" />
              </div>
            </div>
          </div>

          {/* Form Card 2 Skeleton */}
          <div className="p-6 rounded-2xl bg-card border border-theme space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-theme">
              <div className="w-5 h-5 rounded skeleton-shimmer" />
              <div className="h-4 w-36 rounded skeleton-shimmer" />
            </div>
            <div className="space-y-3">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-24 w-full rounded-xl skeleton-shimmer" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PipelineSkeleton() {
  return (
    <div className="flex-1 overflow-x-auto p-6 animate-in fade-in duration-200">
      <div className="inline-flex gap-4 min-w-full pb-4">
        {[
          { label: 'Discovered', count: 3 },
          { label: 'Needs Demo', count: 2 },
          { label: 'Draft Ready', count: 2 },
          { label: 'Contacted', count: 1 },
          { label: 'Cooldown', count: 1 }
        ].map((col, idx) => (
          <div
            key={idx}
            className="w-80 flex-shrink-0 flex flex-col bg-card-subtle rounded-xl border border-theme overflow-hidden shadow-sm"
          >
            {/* Column Header Skeleton */}
            <div className="p-3.5 border-b border-theme flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
                <div className="h-3.5 w-24 rounded skeleton-shimmer" />
              </div>
              <div className="h-5 w-7 rounded-full skeleton-shimmer" />
            </div>

            {/* Cards Skeleton */}
            <div className="p-3 space-y-3 overflow-hidden">
              {Array.from({ length: col.count }).map((_, cIdx) => (
                <div
                  key={cIdx}
                  className="p-3.5 rounded-xl bg-card border border-theme shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 rounded skeleton-shimmer" />
                    <div className="h-4 w-12 rounded-full skeleton-shimmer" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-full rounded skeleton-shimmer" />
                    <div className="h-3 w-3/4 rounded skeleton-shimmer opacity-70" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-14 rounded-md skeleton-shimmer" />
                    <div className="h-5 w-16 rounded-md skeleton-shimmer" />
                  </div>
                  <div className="pt-2 border-t border-theme/60 flex items-center justify-between">
                    <div className="h-3.5 w-20 rounded skeleton-shimmer" />
                    <div className="h-3.5 w-12 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PriorityInboxSkeleton() {
  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
        <div className="h-4 w-48 rounded skeleton-shimmer" />
        <div className="h-5 w-32 rounded-full skeleton-shimmer ml-2" />
      </div>

      {/* Row Cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-card border border-theme shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 rounded skeleton-shimmer" />
                <div className="h-4 w-28 rounded skeleton-shimmer" />
                <div className="h-4 w-36 rounded skeleton-shimmer opacity-60 hidden sm:block" />
              </div>
              <div className="h-4 w-3/4 rounded skeleton-shimmer" />
              <div className="h-3 w-1/2 rounded skeleton-shimmer opacity-70" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
              <div className="h-8 w-8 rounded-lg skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="h-screen max-h-screen bg-canvas text-primary flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Skeleton */}
      <header className="h-16 border-b border-theme bg-surface px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
          <div className="space-y-1 hidden sm:block">
            <div className="h-3.5 w-36 rounded skeleton-shimmer" />
            <div className="h-2.5 w-48 rounded skeleton-shimmer opacity-60" />
          </div>
          <div className="h-8 w-44 rounded-xl skeleton-shimmer ml-4 hidden md:block" />
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-24 rounded-lg skeleton-shimmer hidden sm:block" />
          <div className="h-8 w-24 rounded-lg skeleton-shimmer hidden sm:block" />
          <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
          <div className="h-8 w-8 rounded-lg skeleton-shimmer" />
          <div className="h-8 w-28 rounded-lg skeleton-shimmer" />
        </div>
      </header>

      {/* Subheader / Filter Bar Skeleton */}
      <div className="border-b border-theme bg-surface/60 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
        <div className="h-9 w-full sm:w-80 rounded-xl skeleton-shimmer" />
        <div className="h-8 w-36 rounded-lg skeleton-shimmer self-end sm:self-auto" />
      </div>

      {/* Pipeline Kanban Skeleton */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        <PipelineSkeleton />
      </main>
    </div>
  );
}

