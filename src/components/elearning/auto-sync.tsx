import { Suspense } from "react";
import { getElearningStatus } from "@/features/elearning/status";
import { AutoSyncRunner } from "./sync-client";

async function Runner() {
  const { connected, lastSyncedAt } = await getElearningStatus();
  return <AutoSyncRunner connected={connected} lastSyncedAt={lastSyncedAt} />;
}

/** Invisible: keeps the e-learning tasks fresh without a click. Only a boolean and a timestamp reach the client. */
export function ElearningAutoSync() {
  return (
    <Suspense fallback={null}>
      <Runner />
    </Suspense>
  );
}
