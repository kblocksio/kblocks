import http from "http";
import { WebSocketServer } from 'ws';
import { execSync } from 'child_process';

const map: Record<string, any> = {};
const events: Array<any> = [];

const server = http.createServer();
const wss = new WebSocketServer({ server });

server.on("request", (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(map));
  }

  if (req.method === "GET" && req.url === "/events") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(events));
  }

  if (req.method === "POST") {
    let bodyString = "";
    req.on("data", chunk => bodyString += chunk);
    
    return req.on("end", () => {
      let body;
      try {
        body = JSON.parse(bodyString);
      } catch (err) {
        const message = `Error parsing event <${bodyString}>: ${err}`;
        console.error(message);
        res.statusCode = 400;
        return res.end(message);
      }

      console.log(`${req.method} ${req.url} ${JSON.stringify(body)}`);
      
      if (req.url === "/events") {

        events.push(body);

        if (body.type === "OBJECT") {
          const key = body.objUri;

          // delete managedFields
          delete body.object?.metadata?.managedFields;

          if (Object.keys(body.object).length === 0) {
            delete map[key];
          } else {
            map[key] = body.object;
          }

          return res.end();
        }

        if (body.type === "PATCH") {
          throw new Error("PATCH has been deprecated");
        }
  
        return res.end();
      }

      if (req.url === "/control") {
        for (const client of wss.clients) {
          console.log("Sending message to control client");
          client.send(bodyString);
        }

        return res.end();
      }

      if (req.url === "/reset") {
        execSync('kubectl delete testresources --all --all-namespaces');
        execSync('kubectl delete customresources --all --all-namespaces');
        for (const key of Object.keys(map)) {
          delete map[key];
        }
        events.splice(0, events.length);
        return res.end();
      }
    });
  }

  res.statusCode = 400;
  return res.end();
});

wss.on('connection', (ws) => {
  console.log('Control client connected');

  ws.on("error", (error) => {
    console.log(`WebSocket error: ${error}`);
  });

  ws.on("message", (message) => {
    console.log(`Message from control client: ${message}`);
  });

  ws.on('close', () => {
    console.log('Control client disconnected');
  });
});

// Add shutdown signal handlers
process.on('SIGTERM', () => shutdownServer());
process.on('SIGINT', () => shutdownServer());

function shutdownServer() {
  console.log('Shutting down server...');
  process.exit(0);
}

wss.on("error", (error) => {
  console.log(`WebSocket error: ${error}`);
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
