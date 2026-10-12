import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <header className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Ombre</p>
        <form action={signOut}>
          <button
            type="submit"
            className="-mr-3 h-12 rounded-xl px-4 text-[15px] font-medium text-muted transition active:bg-surface"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-24">
        <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded-lg bg-line" />}>
          <Greeting />
        </Suspense>
      </section>
    </main>
  );
}

async function Greeting() {
  // The greeting depends on who is signed in, so it is always rendered per request.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/");
  return <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Welcome, {firstName(data.user.user_metadata)}.</h1>;
}

function firstName(meta: Record<string, unknown>): string {
  const given = typeof meta.given_name === "string" ? meta.given_name : "";
  const full = [meta.full_name, meta.name].find((v): v is string => typeof v === "string") ?? "";
  return given.trim() || full.trim().split(/\s+/)[0] || "friend";
}
