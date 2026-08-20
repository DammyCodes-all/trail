"use client";

import { GridGlow } from "@/components/landing/hero/grid-glow";
import { useSetupSectionMotion } from "./use-setup-section-motion";

type ComparisonRow = {
  other: string;
  trail: string;
  label: string;
};

const ROWS: ComparisonRow[] = [
  {
    other: "Install an SDK",
    trail: "Add the extension",
    label: "Installation",
  },
  { other: "Create an account", trail: "—", label: "Account" },
  { other: "Add a config file", trail: "—", label: "Configuration" },
  { other: "Redeploy your app", trail: "—", label: "Delivery" },
  {
    other: "Wait for the next release",
    trail: "—",
    label: "Release cycle",
  },
];

export function SetupSection() {
  const root = useSetupSectionMotion();

  return (
    <section
      id="zero-setup"
      ref={root}
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#0d0e10] px-5 pb-14 pt-12 sm:px-8 sm:pb-16 sm:pt-14"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_40%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <GridGlow />
      <div className="relative mx-auto max-w-5xl">
        <div data-copy className="max-w-4xl">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#ff6a00]">
            Zero setup
          </p>
          <h2 className="mt-3 max-w-4xl font-heading text-3xl font-bold leading-[1.05] tracking-normal text-[#f2f4f6] sm:text-[2.75rem]">
            Nothing to set up. Nothing to configure.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#8b929c] sm:text-base sm:leading-7">
            No package to install, no config file, no redeploy. Just an
            extension.
          </p>
        </div>

        <div
          data-panel
          className="relative isolate mt-9 overflow-hidden rounded-md border border-white/10 bg-[#151719] shadow-[0_16px_48px_rgba(0,0,0,0.28)] sm:mt-12"
        >
          <div
            data-trail-tint
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 bg-[radial-gradient(120%_85%_at_50%_-5%,rgba(255,106,0,0.16),transparent_55%)]"
          />
          <table className="relative z-10 w-full table-fixed border-collapse text-left">
            <caption className="sr-only">
              A comparison of the setup required by other tools and Trail.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-1/2 border-r border-white/10 px-4 pb-6 pt-5 align-top sm:px-7 sm:pb-8 sm:pt-7"
                >
                  <div data-column-heading>
                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#626973]">
                      The old way
                    </p>
                    <h3 className="mt-2 font-heading text-2xl font-medium leading-[0.98] tracking-normal text-[#8b929c] sm:text-[2.75rem]">
                      Typical setup
                    </h3>
                  </div>
                </th>
                <th
                  scope="col"
                  className="w-1/2 px-4 pb-6 pt-5 align-top sm:px-7 sm:pb-8 sm:pt-7"
                >
                  <div data-column-heading>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff6a00]">
                      The Trail way
                    </p>
                    <h3 className="mt-3 font-heading text-2xl font-medium leading-[0.98] tracking-normal text-white sm:text-[2.75rem]">
                      Open. Record.
                    </h3>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, index) => (
                <tr key={row.label} data-row-group data-row-index={index}>
                  <td className="border-r border-t border-white/10 px-4 py-3.5 align-top sm:px-7 sm:py-4">
                    <div data-row-cell data-row-index={index}>
                      <p className="break-words text-[13px] leading-5 text-[#8b929c] sm:text-sm sm:leading-6">
                        {row.other}
                      </p>
                      <span className="mt-0.5 block font-mono text-[7px] uppercase tracking-[0.16em] text-[#626973]">
                        {row.label}
                      </span>
                    </div>
                  </td>
                  <td className="border-t border-white/10 px-4 py-3.5 align-top sm:px-7 sm:py-4">
                    <div data-row-cell data-row-index={index}>
                      <p
                        data-dash={row.trail === "—" ? "" : undefined}
                        className={`break-words ${
                          row.trail === "—"
                            ? "font-semibold text-[15px] leading-6 text-[#f2f4f6] sm:text-[17px] sm:leading-7"
                            : "text-[13px] leading-5 text-[#f2f4f6] sm:text-sm sm:leading-6"
                        }`}
                      >
                        {row.trail}
                      </p>
                      <span className="mt-0.5 block font-mono text-[7px] uppercase tracking-[0.16em] text-[#626973]">
                        {row.label}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p
          data-payoff
          className="mt-6 font-mono text-xs tracking-[0.05em] text-[#8b929c]"
        >
          <span
            data-payoff-dot
            aria-hidden="true"
            className="mr-2 inline-block size-[6px] rounded-full bg-[#ff6a00] align-[2px]"
          />
          Open the extension. Hit record.
        </p>
      </div>
    </section>
  );
}
