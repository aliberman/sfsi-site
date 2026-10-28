import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import OAuthButtons from "@/components/OAuthButtons";
import { sessionHint } from "@/components/session-hint";
import { enabledProviders } from "@/lib/oauth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: { next?: string; package?: string } }) {
  const next = searchParams.next ?? (searchParams.package ? `/portal/events/new?package=${encodeURIComponent(searchParams.package)}` : undefined);
  if (await sessionHint()) redirect(next ?? "/portal");
  return (
    <section className="container max-w-md py-16">
      <h1 className="font-display text-3xl font-semibold">Create your family portal</h1>
      <p className="mt-2 text-gray-600">Plan your simchah, request quotes, and manage payments in one place.</p>
      <div className="card mt-8 grid gap-5">
        <OAuthButtons providers={enabledProviders()} next={next} verb="Sign up" />
        <RegisterForm next={next} />
      </div>
    </section>
  );
}
