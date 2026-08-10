// The @trail/review package reads env via `import.meta.env` (Vite-style) with
// a process.env fallback. Next supports import.meta.env at runtime but does
// not ship Vite's type declarations — provide the minimal shape here.
interface ImportMeta {
  env: Record<string, string | undefined>;
}
