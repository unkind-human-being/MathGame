// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="max-w-md text-center space-y-4">
        <div className="text-4xl">📴</div>
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="text-sm text-slate-300">
          ASMATH can&apos;t reach the server right now.
          You can still reopen the app from your home screen.
        </p>
      </div>
    </main>
  );
}
