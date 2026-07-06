export default function HomeLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-32 rounded-2xl bg-muted/50" />
      <div className="h-20 rounded-2xl bg-muted/40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/40" />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-muted/30" />
    </div>
  );
}
