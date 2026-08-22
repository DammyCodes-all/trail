export const CTA_HREF = "/beta";
export const CTA_LABEL = "Record your first bug";

export const GITHUB_HREF = "https://github.com/DammyCodes-all/trail";
export const X_HREF = "https://x.com/dev_aluminate";

/**
 * Public beta distribution. Bump BETA_VERSION, BETA_RELEASE_DATE and
 * BETA_DOWNLOAD_HREF together whenever a new zip asset is published —
 * the /beta page badge must always match the downloadable build.
 */
export const BETA_VERSION = "v0.1.0";
export const BETA_RELEASE_DATE = "August 22, 2026";
// Pinned to the tag (not /releases/latest/) because latest/ skips
// pre-releases. Bump together with BETA_VERSION on every drop.
export const BETA_DOWNLOAD_HREF = `https://github.com/DammyCodes-all/trail/releases/download/${BETA_VERSION}/trail-beta-${BETA_VERSION}.zip`;
export const BETA_REPORT_HREF =
  "https://github.com/DammyCodes-all/trail/issues/new?labels=beta&title=Beta%3A%20";
