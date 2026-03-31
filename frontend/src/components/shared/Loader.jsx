export function Loader() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="flex items-center gap-2.5 font-mono text-sm text-grey-400">
        <div className="w-2 h-2 rounded-full bg-raven-orange animate-pulse" />
        Loading data...
      </div>
    </div>
  );
}
