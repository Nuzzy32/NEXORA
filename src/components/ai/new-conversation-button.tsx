"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/icons";
import { createConversation } from "@/features/ai/actions";
import { IDLE } from "@/lib/action-state";

/** Creates an empty conversation and opens it (the action redirects). Disabled while no provider can answer. */
export function NewConversationButton({ disabled = false, className = "" }: { disabled?: boolean; className?: string }) {
  const [state, formAction, pending] = useActionState(createConversation, IDLE);
  return (
    <form action={formAction} className={className}>
      <button
        type="submit"
        disabled={disabled || pending}
        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11"
      >
        <Icon name="plus" className="size-4" />
        {pending ? "Membuat…" : "Percakapan baru"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
