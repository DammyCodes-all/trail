import type { LucideIcon } from "lucide-react";
import { Braces, Download, FileText, Network, Terminal } from "lucide-react";

const attachmentIcons = {
  report: FileText,
  network: Network,
  console: Terminal,
  metadata: Braces,
} satisfies Record<string, LucideIcon>;

export interface ReviewAttachment {
  kind: keyof typeof attachmentIcons;
  name: string;
  detail: string;
  onDownload: () => void;
}

export function AttachmentsPanel({
  attachments,
}: {
  attachments: ReviewAttachment[];
}) {
  return (
    <section className="py-8 sm:py-10">
      <div className="rounded-sm border border-border bg-card/30 p-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Attachments
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {attachments.map((attachment) => {
            const Icon = attachmentIcons[attachment.kind];
            return (
              <button
                key={attachment.name}
                type="button"
                className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-sm border border-border bg-background/50 px-3 py-3 text-left outline-none transition-[background-color,border-color] hover:border-border-strong hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={attachment.onDownload}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {attachment.name}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {attachment.detail}
                  </span>
                </span>
                <Download
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
