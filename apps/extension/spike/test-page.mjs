import http from 'node:http';

const PAGE1 = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Trail test page 1</title></head>
<body>
  <h1>Checkout</h1>
  <p class="rr-block">This whole paragraph is blocked from replay.</p>
  <label for="email">Email</label> <input id="email" type="text" autocomplete="email"><br>
  <label for="pass">Password</label> <input id="pass" type="password" autocomplete="current-password"><br>
  <button id="boom" onclick="throw new Error('boom: price calc failed')">Submit</button>
  <button id="dbl" onclick="window.__dbl = (window.__dbl || 0) + 1">Tap twice</button>
  <button id="xhr" onclick="var x=new XMLHttpRequest();x.open('GET','/missing-xhr');x.send()">Do XHR</button>
  <a id="next" href="/page2.html">Go to step 2</a>
  <script>
    console.error('simulated load error: cart is empty');
    fetch('/missing', { method: 'POST' }).catch(function () {});
  </script></body>
</html>`;

const PAGE2 = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Trail test page 2</title></head>
<body>
  <h1>Payment</h1>
  <button id="pay" onclick="window.__pay()">Pay now</button>
  <a href="/page1.html">Back</a>
  <script>
    console.error('page2 load error: payment gateway unreachable');
    window.__pay = function () {
      console.error('simulated payment failure');
      fetch('/fail', { headers: { 'Authorization': 'Bearer hunter2' } }).catch(function () {});
    };
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/page1.html' || url === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE1);
  } else if (url === '/page2.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE2);
  } else if (url === '/missing' || url === '/missing-xhr') {
    res.writeHead(404, {
      'content-type': 'text/plain',
      'x-trail-test': 'yes',
    });
    res.end('not found');
  } else if (url === '/fail') {
    res.writeHead(500, {
      'content-type': 'text/plain',
      'x-trail-test': 'yes',
    });
    res.end('server blew up for ops@example.com');
  } else {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
  }
});

const port = Number(process.env.TEST_PORT ?? 8899);
server.listen(port, () => console.log(`test page server on http://localhost:${port}`));
