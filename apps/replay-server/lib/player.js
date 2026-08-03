// The share page: rebuilds a TRAIL session with rrweb-player from the JSON
// served at /api/replays/<id>.json. Served by both the local twin and the
// Vercel function (which also answers the /r/:id rewrite).

export function playerHtml(id) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TRAIL replay</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/rrweb-player@1/dist/style.css">
<script src="https://cdn.jsdelivr.net/npm/rrweb-player@1/dist/index.js"></script>
<style>
  body { margin: 0; background: #0b0f14; color: #e6edf3; font-family: system-ui, sans-serif; }
  header { padding: 16px 20px; display: flex; align-items: baseline; gap: 12px; }
  header h1 { font-size: 15px; margin: 0; }
  header span { font-size: 12px; color: #8b949e; }
  #player { max-width: 1000px; margin: 0 auto; padding: 0 16px 40px; }
  #err { max-width: 1000px; margin: 48px auto; padding: 0 16px; color: #f85149; font-size: 14px; }
</style>
</head>
<body>
<header>
  <h1>TRAIL replay</h1>
  <span id="meta"></span>
</header>
<div id="player"></div>
<div id="err" hidden></div>
<script>
  const id = ${JSON.stringify(id)};
  const meta = document.getElementById('meta');
  const errBox = document.getElementById('err');
  const fail = (msg) => { errBox.hidden = false; errBox.textContent = msg; };
  fetch(location.origin + '/api/replays/' + encodeURIComponent(id) + '.json')
    .then((r) => { if (!r.ok) throw new Error('not found'); return r.json(); })
    .then((data) => {
      if (!Array.isArray(data.events) || !data.events.length) throw new Error('empty replay');
      meta.textContent = data.title ? data.title + ' \u00b7 ' + data.events.length + ' frames' : data.events.length + ' frames';
      new rrwebPlayer({
        target: document.getElementById('player'),
        data: { events: data.events, width: 1280, height: 720 },
        props: { showController: true, autoPlay: false, width: 960 },
      });
    })
    .catch((e) => fail('Replay not found or the server is unavailable (' + e.message + ').'));
</script>
</body>
</html>`;
}
