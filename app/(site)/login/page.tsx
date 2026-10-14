import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <section className="container max-w-md py-16">
      <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-gray-600">Sign in to your family portal.</p>
      <div className="card mt-8"><LoginForm next={searchParams.next} /></div>
    </section>
  );
}
