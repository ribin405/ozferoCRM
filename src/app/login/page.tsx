import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="auth-stage">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Ozfero" className="auth-logo" />
        <h1>Vendor Desk</h1>
        <p className="auth-sub">Ozfero Offers team sign-in</p>
        <LoginForm notice={error === "inactive" ? "Your access has been deactivated." : undefined} />
      </div>
      <p className="auth-foot">Internal use only · Ozfero Offers</p>
    </main>
  );
}
