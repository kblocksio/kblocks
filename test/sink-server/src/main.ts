import { Server } from 'ws';
import http from 'http';


const map: Record<string, any> = {};

const server = http.createServer();

server.on("request", (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(map));
  } else {
    res.statusCode = 404;
    res.end();
  }
});

const wss = new Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    const msg = message.toString();
    try {
      const event = JSON.parse(msg);
      console.log('Received:', JSON.stringify(event));

      if ("objRef" in event) {
        const key = `${event.objRef.apiVersion}/${event.objRef.kind}/${event.objRef.namespace}/${event.objRef.name}`;

        if ("object" in event) {
          map[key] = event.object;
        }
  
        if ("patch" in event) {
          map[key] = {
            ...map[key] ?? {},
            ...event.patch,
          };
        }
      }

    } catch (err) {
      console.error(`Error parsing event <${msg}>: ${err}`);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Modify the app.listen call to use the http server
server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
