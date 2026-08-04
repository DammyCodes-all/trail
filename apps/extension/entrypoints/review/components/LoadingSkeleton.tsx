import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-300 px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-28 rounded-sm" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-sm" />
          <Skeleton className="h-10 w-44 rounded-sm" />
        </div>
      </div>
      <div className="flex flex-col gap-3 py-12">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-4 border-y border-border py-5 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 rounded-sm" />
        ))}
      </div>
      <div className="border-b border-border py-10">
        <Skeleton className="h-7 w-40 rounded-sm" />
        <Skeleton className="mt-6 h-120 rounded-sm" />
      </div>
      <div className="border-b border-border py-10">
        <Skeleton className="h-7 w-36 rounded-sm" />
        <Skeleton className="mt-4 h-150 rounded-sm" />
      </div>
    </div>
  );
}
