type TrailNode = {
  time: string;
  label: string;
  tone?: "error";
};

const NODES: TrailNode[] = [
  { time: "00:00", label: "Page loaded" },
  { time: "00:01", label: "Clicked Checkout" },
  { time: "00:03", label: "Entered card details" },
  { time: "00:05", label: "Clicked Pay" },
  { time: "00:06", label: "POST /api/pay → 500", tone: "error" },
  { time: "00:08", label: "Payment failed", tone: "error" },
];

const EVIDENCE: { label: string; value: string; tone?: "error" }[] = [
  { label: "Status", value: "500", tone: "error" },
  { label: "Duration", value: "1.82s" },
  { label: "Console", value: "PaymentError", tone: "error" },
];

export function TrailSection() {
  return (
    <section
      id="follow-the-trail"
      className="border-t border-white/10 bg-[#0d0e10] px-5 pb-32 pt-20 sm:px-8 sm:pb-40 sm:pt-24 lg:px-10"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#ff8a1f]">
          Follow the trail
        </p>
        <h2 className="mt-5 font-heading text-[clamp(1.75rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.035em] text-[#f2f4f6]">
          See exactly <span className="text-[#ff6a00]">where</span> it went wrong.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#8b929c] sm:text-lg sm:leading-8">
          Every interaction becomes part of the story, connecting user actions
          to what happened underneath.
        </p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-7xl text-left lg:mt-12">
        <div className="relative">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#8b929c]">
              Session timeline
            </span>
            <time className="font-mono text-[11px] tabular-nums text-[#f2f4f6]">
              00:08.42
            </time>
          </div>

          <div
            aria-hidden="true"
            className="relative overflow-x-auto [scrollbar-width:thin]"
          >
            <div className="min-w-[800px] px-4 sm:px-6 lg:min-w-0 lg:px-8">
              <div className="relative py-10 lg:py-14">
                <div
                  aria-hidden="true"
                  className="absolute left-[8.3333%] right-[8.3333%] top-[13px] h-px bg-gradient-to-r from-white/30 via-white/20 to-[#ff4d4f]/70"
                />
                <ol className="relative grid grid-cols-6">
                {NODES.map((node) => (
                  <li
                    key={node.time}
                    className="flex flex-col items-center pt-2 text-center"
                  >
                    <span
                      className={`size-2.5 rounded-full border-2 border-[#0d0e10] ${
                        node.tone === "error"
                          ? "bg-[#ff4d4f] shadow-[0_0_0_2px_rgba(255,77,79,0.18)]"
                          : "bg-white/30"
                      }`}
                    />
                    <span className="mt-1.5 h-5 w-px bg-white/10" />
                    <p
                      className={`mt-1 whitespace-nowrap font-mono text-[10px] ${
                        node.tone === "error"
                          ? "font-medium text-[#ff4d4f]"
                          : "text-[#8b929c]"
                      }`}
                    >
                      {node.label}
                    </p>
                    <time className="mt-1 font-mono text-[9px] tabular-nums text-[#626973]">
                      {node.time}
                    </time>
                  </li>
                ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2 px-4 pb-1 pt-9 sm:px-6 lg:px-8">
            <span className="font-mono text-[11px] font-semibold text-[#f2f4f6]">
              POST
            </span>
            <span className="font-mono text-[11px] text-[#8b929c]">/api/pay</span>
            <span className="ml-auto rounded-sm bg-[#ff4d4f]/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#ff4d4f]">
              500
            </span>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-3">
            {EVIDENCE.map((row) => (
              <div key={row.label} className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
                <span className="block text-[9.5px] text-[#626973]">
                  {row.label}
                </span>
                <span
                  className={`mt-1 block font-mono text-xs font-semibold tabular-nums ${
                    row.tone === "error" ? "text-[#ff4d4f]" : "text-[#f2f4f6]"
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-14 text-center font-heading text-2xl font-semibold tracking-[-0.02em] text-[#f2f4f6] sm:text-3xl">
        No reconstruction. No assumptions. Just the path the bug took.
      </p>
    </section>
  );
}