import http from "http";
import { WebSocketServer, WebSocket } from 'ws';

const map: Record<string, any> = {};

let control: WebSocket | undefined;

const server = http.createServer();
const wss = new WebSocketServer({ server });

server.on("request", (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(map));
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

        if (body.type === "OBJECT") {
          const key = body.objUri;
          map[key] = body.object;

          // delete managedFields
          delete map[key].metadata?.managedFields;

          return res.end();
        }

        if (body.type === "PATCH") {
          const key = body.objUri;
          map[key] = {
            ...map[key] ?? {},
            ...body.patch,
          };

          return res.end();
        }
  
        return res.end();
      }

      if (req.url === "/control") {
        if (!control) {
          res.statusCode = 404;
          res.statusMessage = "No control connection";
          return res.end();
        }

        control.send(bodyString);
        return res.end();
      }
    });
  }

  res.statusCode = 400;
  return res.end();
});

wss.on('connection', (ws) => {
  console.log('Control client connected');
  control = ws;
  ws.on('close', (code, reason) => {
    console.log('Control client disconnected');
    console.log(`code: ${code}`);
    console.log(`reason: ${reason.toString()}`);
    control = undefined;
  });
});

wss.on("error", (error) => {
  console.log(`WebSocket error: ${error}`);
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
