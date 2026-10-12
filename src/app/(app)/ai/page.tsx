import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "@/components/ai/workspace";
import { WorkspaceSkeleton } from "@/components/ai/workspace-skeleton";
import { EMPTY_BUNDLE } from "@/features/ai/context-bundle";
import { getContextBundle, listContextCandidates } from "@/features/ai/context-queries";
import { clockLabel, groupConversations } from "@/features/ai/group";
import { listProviders, providerLabel } from "@/features/ai/providers/registry";
import { getThread, listConversations } from "@/features/ai/queries";
import { todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "AI Workspace" };

export default function AiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <h1 className="sr-only">AI Workspace</h1>
      <Suspense fallback={<WorkspaceSkeleton />}>
        <AiContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AiContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { c } = await searchParams;
  const id = Array.isArray(c) ? c[0] : c;
  const [conversations, thread, context, candidates] = await Promise.all([
    listConversations(),
    id ? getThread(id) : null,
    id ? getContextBundle(id) : EMPTY_BUNDLE,
    // The picker's lists are optional: if they fail to load, the picker says so and the thread still works.
    id ? listContextCandidates().catch(() => null) : null,
  ]);
  const providers = listProviders().map(({ id, label, isMock }) => ({ id, label, isMock }));

  return (
    <Workspace
      // A fresh mount per conversation: drafts, drawers and errors never carry over.
      key={thread?.conversation.id ?? (id ? "missing" : "none")}
      groups={groupConversations(conversations, todayISO())}
      total={conversations.length}
      active={
        thread && {
          id: thread.conversation.id,
          title: thread.conversation.title,
          messages: thread.messages.map((m) => ({
            ...m,
            time: clockLabel(m.created_at),
            providerLabel: m.provider_id ? providerLabel(m.provider_id) : null,
          })),
        }
      }
      missing={Boolean(id) && thread === null}
      providers={providers}
      context={context}
      candidates={candidates}
    />
  );
}
