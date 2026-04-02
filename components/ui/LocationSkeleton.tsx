export default function LocationSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8 animate-pulse">
        {/* Header */}
        <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>

        {/* Location Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-5 w-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mb-10">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>

        {/* Tables */}
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i}>
              <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
