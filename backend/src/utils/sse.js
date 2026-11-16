/**
 * Server-Sent Events for one response.
 *
 * Headers stop buffering on the way out: nginx honours `X-Accel-Buffering: no`, and
 * `no-transform` keeps proxies from compressing (and so holding back) the stream. Passenger
 * on cPanel may still buffer; the browser then falls back to the non-streaming endpoint.
 * A comment line every 15 s keeps idle connections open.
 */
function openSse(res, { heartbeatMs = 15000 } = {}) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  // Some proxies wait for a first block of data before passing anything on.
  res.write(`: ${" ".repeat(2048)}\n\n`);

  let closed = false;
  const heartbeat = setInterval(() => {
    if (!closed) res.write(": ping\n\n");
  }, heartbeatMs);
  heartbeat.unref?.();

  return {
    /** One event; `data` is sent as JSON on a single line. */
    send(event, data) {
      if (closed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      res.end();
    },
  };
}

module.exports = { openSse };
