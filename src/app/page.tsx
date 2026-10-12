import { Suspense } from "react";
import { GoogleButton } from "@/components/google-button";
import { SignInError } from "@/components/sign-in-error";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signInWithGoogle } from "./actions";

export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-[max(env(safe-area-inset-top),3rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Ombre</p>

      <div className="flex flex-1 flex-col justify-center py-12">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight">
          Small check-ins.
          <br />
          Steady progress.
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">
          A quiet place to track how you&apos;re doing, one morning at a time.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Suspense>
          <SignInError />
        </Suspense>
        {isSupabaseConfigured ? (
          <form action={signInWithGoogle}>
            <GoogleButton />
          </form>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-center text-[15px] text-muted">
            Almost there — the app isn&apos;t connected to Supabase yet. Add your keys to{" "}
            <code className="text-foreground">.env.local</code>.
          </p>
        )}
        <p className="text-center text-[13px] text-muted">Private by default. Only you can see your data.</p>
      </div>
    </main>
  );
}
