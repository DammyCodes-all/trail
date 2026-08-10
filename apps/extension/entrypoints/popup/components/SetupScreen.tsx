import { Button } from "@trail/review/ui/button";
import { Label } from "@trail/review/ui/label";
import { PulsatingButton } from "@trail/review/ui/pulsating-button";
import {
  Switch,
  SwitchThumb,
} from "@trail/review/animate-ui/primitives/base/switch";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function SetupScreen({
  autoRedact,
  onToggleRedact,
  busy,
  onBack,
  onBegin,
}: {
  autoRedact: boolean;
  onToggleRedact: (value: boolean) => void;
  busy: boolean;
  onBack: () => void;
  onBegin: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2 -px-2">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={onBack}
          disabled={busy}
          aria-label="Back"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
      </div>
      <section className="px-4 flex min-h-0 flex-1 flex-col gap-3">
        {" "}
        <p className="text-body-sm text-muted-foreground">
          Open the page with the bug, then begin recording. TRAIL captures
          clicks, typed input, console errors, and failed requests.
        </p>{" "}
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <Label className="text-[13px] font-medium">
                Auto-redact typed values
              </Label>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Mask anything you type in the report and replay.
              </p>
            </div>
          </div>
          <Switch
            checked={autoRedact}
            onCheckedChange={(v) => onToggleRedact(v)}
            aria-label="Auto-redact typed values"
            className="relative flex h-[18.4px] w-[32px] shrink-0 cursor-pointer items-center justify-start rounded-full border border-transparent p-[2px] outline-none transition-colors select-none data-[checked]:justify-end data-[checked]:bg-primary data-[unchecked]:bg-input data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <SwitchThumb
              className="pointer-events-none block h-full aspect-square rounded-full bg-foreground shadow-sm data-[checked]:bg-primary-foreground"
              pressedAnimation={{ scale: 1.2 }}
            />
          </Switch>
        </div>{" "}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <PulsatingButton
            id="begin"
            onClick={onBegin}
            disabled={busy}
            duration="1.8s"
            distance="12px"
            className="size-24 rounded-full text-sm font-semibold uppercase tracking-widest"
          >
            start
          </PulsatingButton>
        </div>
      </section>
    </div>
  );
}
