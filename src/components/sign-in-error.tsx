"use client";

import { useSearchParams } from "next/navigation";

export function SignInError() {
  if (useSearchParams().get("error") !== "signin") return null;
  return (
    <p role="alert" className="rounded-xl bg-surface px-4 py-3 text-center text-[15px] text-muted">
      Sign-in didn&apos;t finish. Please try again.
    </p>
  );
}
