import type { FormSubmitEvent } from "@/lib/types";
import type { RecordContext } from "./context";
import { cap } from "./format";
import { formLabelFor, labelFor } from "./labels";

// A form submission is an action in its own right: keyboard implicit
// submission (Enter in a field) and button-click submits land here bearing
// the form's context — label, method, action. The click that triggered a
// button-click submit is carried as `submitter` (the submit event's own
// submitter property — causal identity, not a guessed window), so the
// timeline can fold that click into this step instead of printing both.
// Note: programmatic form.submit() fires no submit event and is not
// captured — acceptable, it is not a user action.
export const instrumentSubmits = (ctx: RecordContext) => {
  const { emit, isActive, pageUrl } = ctx;
  addEventListener(
    "submit",
    (e) => {
      if (!isActive()) return;
      const form = e.target as HTMLFormElement | null;
      if (!form || !form.submit) return;
      const submitter = e.submitter as Element | null;
      const ev: FormSubmitEvent = {
        k: "submit",
        label: formLabelFor(form),
        method: (form.method || "get").toUpperCase(),
        action: cap(form.action || "", 300) ?? "",
        t: Date.now(),
        url: pageUrl(),
        ...(submitter
          ? {
              submitter: {
                label: labelFor(submitter) ?? `<${submitter.tagName.toLowerCase()}>`,
                tag: submitter.tagName.toLowerCase(),
              },
            }
          : {}),
      };
      emit(ev);
    },
    true,
  );
};