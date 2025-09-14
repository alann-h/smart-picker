export const AvailableQuotesSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="w-full bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-4">
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
            </div>
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const RunListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="bg-white border border-gray-200 rounded-lg shadow-sm animate-pulse">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-6 w-24 bg-gray-200 rounded"></div>
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);
