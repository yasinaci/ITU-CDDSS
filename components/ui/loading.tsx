export const PageSkeleton = () => (
  <div className="space-y-4">
    <div className="skeleton h-8 w-52 rounded-md" />
    <div className="grid gap-4 md:grid-cols-3">
      <div className="skeleton h-32 rounded-lg" />
      <div className="skeleton h-32 rounded-lg" />
      <div className="skeleton h-32 rounded-lg" />
    </div>
    <div className="skeleton h-[440px] rounded-lg" />
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
    <p className="font-semibold">Could not load data</p>
    <p className="mt-1 text-sm">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
    >
      Retry
    </button>
  </div>
);
