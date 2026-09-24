import Logo from "./Logo";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,#3a2449_0,transparent_50%)] px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Logo height={46} />
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
