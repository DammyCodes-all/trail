export const POST_MESSAGE_KEY = '__trail__';
export const RECORDER_ID = 'trail-recorder';

export const DB_NAME = 'trail';
export const EVENTS_STORE = 'events';
export const REPORTS_STORE = 'reports';
export const SESSIONS_STORE = 'sessions';

export const MSG_BATCH = 'trail:batch';
export const MSG_START = 'trail:start';
export const MSG_STOP = 'trail:stop';
export const MSG_STATUS = 'trail:status';
export const MSG_OVERLAY_STATUS = 'trail:overlay-status';
export const MSG_OVERLAY_UPDATE = 'trail:overlay-update';
export const MSG_REDACT = 'trail:redact';
export const MSG_STOP_RECORDER = 'trail:stop-recorder';
export const MSG_START_RECORDER = 'trail:start-recorder';

// chrome.storage.local keys for persisted preferences
export const REDACT_KEY = 'trail:autoRedact';
export const REPO_KEY = 'trail:repo';

// Base URL of the replay share server (see replay-server/). Points at the local
// twin by default; swap in the Vercel deployment URL for production.
export const REPLAY_SERVER_URL = 'http://localhost:8898';
