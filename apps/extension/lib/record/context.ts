// Shared context for the MAIN-world recorders: how they emit captured events,
// whether capture is currently armed, and the page URL at event time.
export interface RecordContext {
  emit: (d: object) => void;
  isActive: () => boolean;
  pageUrl: () => string;
}
