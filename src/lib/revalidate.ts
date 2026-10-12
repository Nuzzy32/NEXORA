import { revalidatePath } from "next/cache";

/** Drops cached routes after a mutation. Pages are dynamic and the app is small, so one broad call is enough. */
export function refreshApp() {
  revalidatePath("/", "layout");
}
