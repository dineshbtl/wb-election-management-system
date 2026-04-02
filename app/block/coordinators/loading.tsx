export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-8 w-1/3 bg-gray-200 rounded mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>

        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
