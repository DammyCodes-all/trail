import type { Placement } from "./physics";

// The overlay remembers where the user parked it, in chrome.storage.local.
const STORAGE_KEY = "trail:recording-overlay-placement";

export const readPlacement = async (): Promise<Placement> => {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Partial<Placement> | undefined;
  if (
    value &&
    typeof value.offset === "number" &&
    ["left", "right", "top", "bottom"].includes(String(value.edge))
  ) {
    return { edge: value.edge as Placement["edge"], offset: value.offset };
  }
  return { edge: "right", offset: 96 };
};

export const writePlacement = (placement: Placement) => {
  void browser.storage.local.set({ [STORAGE_KEY]: placement });
};
