"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * chrome:// pages can't be hyperlinked, so the install step renders the
 * command as a copyable chip instead of a link.
 */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#151719] py-1 pl-3 pr-1 font-mono text-xs text-[#f2f4f6]">
      {command}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${command}`}
        className="inline-flex size-6 cursor-pointer items-center justify-center rounded-[5px] text-[#8b929c] outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#f2f4f6] focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
      >
        {copied ? (
          <Check className="size-3.5 text-[#37d67a]" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
