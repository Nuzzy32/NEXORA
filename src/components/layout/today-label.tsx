import { io } from "next/cache";
import { longDate } from "@/lib/date";

/** Today's date as the dashboard subtitle. The date changes, so it is rendered at request time: use inside <Suspense>. */
export async function TodayLabel() {
  await io();
  return <>{longDate()}</>;
}
