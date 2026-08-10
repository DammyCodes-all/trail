// Stand-in for the web app's /r/<id> handoff page (see apps/web; the real
// handoff is exercised by verify:web). Serves one page on the web origin
// (http://localhost:3000) that performs the extension handoff bridge:
// post an 'open-share' message with the share link, then expose the ack the
// relay forwards back — ok:true means the extension opened its review tab.
import http from 'node:http';

const PORT = Number(process.env.WEB_PORT ?? 3000);

const PAGE = `<!doctype html><meta charset="utf-8"><title>handoff</title>
<script>
  window.__trailAck = null;
  window.__trailPosted = false;
  const link = new URLSearchParams(location.search).get('link') ?? '';
  window.addEventListener('message', (e) => {
    if (e.data && e.data.__trail__ === 'open-ack') window.__trailAck = e.data;
  });
  // Announce readiness to the driver, then fire the handoff.
  window.postMessage({ __trail__: 'handoff-ready' }, '*');
  window.__trailPosted = true;
  window.postMessage({ __trail__: 'open-share', link }, '*');
</script>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(PAGE);
});
server.listen(PORT, () => {
  console.log(`web handoff server on http://localhost:${PORT}`);
});
