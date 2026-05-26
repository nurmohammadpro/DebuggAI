export default function ProjectsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
          style={{ borderColor: 'var(--app-accent)', borderTopColor: 'transparent' }}
        />
      </div>
    </div>
  );
}
