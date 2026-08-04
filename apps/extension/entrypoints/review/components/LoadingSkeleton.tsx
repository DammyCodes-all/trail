import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex flex-col gap-3 border-b border-border pb-5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-5 pt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,28rem)]">
        <Skeleton className="h-120 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
