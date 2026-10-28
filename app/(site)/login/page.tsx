import { LoginForm } from "@/components/AuthForms";
import OAuthButtons from "@/components/OAuthButtons";
import { enabledProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <section className="container max-w-md py-16">
      <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-gray-600">Sign in to your family portal.</p>
      <div className="card mt-8 grid gap-5">
        {searchParams.error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{searchParams.error}</p>}
        <OAuthButtons providers={enabledProviders()} next={searchParams.next} />
        <LoginForm next={searchParams.next} />
      </div>
    </section>
  );
}
