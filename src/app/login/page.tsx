import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg, var(--rail-a) 0%, #1f6a14 38%, var(--rail-b) 100%)" }}
    >
      <div className="card w-full max-w-sm space-y-5 p-6" style={{ boxShadow: "0 24px 60px #00000040" }}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ozfero-icon.png" alt="Ozfero" className="h-14 w-14 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold">Vendor Desk</h1>
            <p className="text-sm text-slate-500">Ozfero Offers team sign-in</p>
          </div>
        </div>
        <LoginForm notice={error === "inactive" ? "Your access has been deactivated." : undefined} />
      </div>
    </main>
  );
}
