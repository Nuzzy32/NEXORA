import { z } from "zod";

export type ActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  /** Id of the row an action just created (lets the UI offer "Urungkan"). */
  id?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  /** Submitted values, so a form keeps what the user typed after a failed submit. */
  values?: Record<string, string>;
};

export const IDLE: ActionState = { status: "idle" };

function submitted(formData: FormData, fields: readonly string[]) {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

/** Validation failure: per-field messages plus the submitted values. */
export function invalid(error: z.ZodError, formData: FormData, fields: readonly string[]): ActionState {
  return { status: "error", fieldErrors: z.flattenError(error).fieldErrors, values: submitted(formData, fields) };
}

/** Operation failure with a user-facing message (never the raw database error). */
export function failed(message: string, formData?: FormData, fields: readonly string[] = []): ActionState {
  return { status: "error", message, values: formData ? submitted(formData, fields) : undefined };
}
