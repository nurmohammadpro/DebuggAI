export default function LoadingPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--app-bg)]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--app-accent)' }}
        />
        <p className="text-[13px] text-[var(--app-text-muted)]">Loading...</p>
      </div>
    </div>
  );
}
