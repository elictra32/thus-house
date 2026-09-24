export default function LoadingSpinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="กำลังโหลด"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-brand-light">
      <LoadingSpinner size={32} />
    </div>
  );
}
