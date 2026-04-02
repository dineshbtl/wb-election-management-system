export default function Loading() {
  return (
    <div className="p-8 space-y-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
