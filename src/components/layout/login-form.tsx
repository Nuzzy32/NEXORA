"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/features/auth/actions";
import { Button, inputClass } from "@/components/ui/button";

const label = "block font-mono text-[11px] tracking-[0.04em] text-muted uppercase";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className={label}>Email</label>
        <input
          id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.email} className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className={label}>Password</label>
        <input
          id="password" name="password" type="password" autoComplete="current-password" required
          className={inputClass}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full min-h-11">
        {pending ? "Masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
