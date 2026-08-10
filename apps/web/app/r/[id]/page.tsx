import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { REPLAY_SERVER_URL, WEB_URL } from "@trail/review/lib/constants";
import type { SharedReportPayload } from "@trail/review/lib/types";
import SharedView from "@/components/shared-view";
import { SharedReplayError } from "./shared-error";

const ID_RE = /^[A-Za-z0-9.-]{1,64}$/;

async function fetchPayload(id: string): Promise<SharedReportPayload | null> {
  try {
    const res = await fetch(`${REPLAY_SERVER_URL}/api/replays/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as SharedReportPayload;
    if (payload?.v !== 2 || !Array.isArray(payload.events) || !payload.report) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!ID_RE.test(id)) return { title: "TRAIL — shared replay" };
  const payload = await fetchPayload(id);
  return {
    title: payload?.report?.title
      ? `${payload.report.title} — TRAIL`
      : "TRAIL — shared replay",
  };
}

export default async function SharedReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ID_RE.test(id)) notFound();
  const payload = await fetchPayload(id);
  if (!payload) {
    return <SharedReplayError />;
  }
  // Canonical share URL — used for the handoff and the share-cache source.
  // Same env the extension builds from, so the two always agree.
  const link = `${WEB_URL}/r/${id}`;
  return <SharedView payload={payload} link={link} />;
}
