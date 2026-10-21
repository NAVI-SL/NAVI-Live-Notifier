import { createServer } from 'node:http';
export async function startWebhookServer(port: number, handler: (r: Request) => Promise<Response>) {
  const server = createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const data = Buffer.from(chunk);
        size += data.length;
        if (size > 65536) {
          res.writeHead(413);
          res.end();
          return;
        }
        chunks.push(data);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers))
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
      const method = req.method ?? 'GET';
      const response = await handler(
        new Request(`http://127.0.0.1:${port}${req.url ?? '/'}`, {
          method,
          headers,
          ...(['GET', 'HEAD'].includes(method) ? {} : { body: Buffer.concat(chunks) }),
        }),
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch {
      res.writeHead(503);
      res.end();
    }
  });
  server.maxHeadersCount = 30;
  server.requestTimeout = 10000;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  return () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
}
