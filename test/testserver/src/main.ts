import http from "http";
import { execSync } from 'child_process';
import Redis from 'ioredis';
import { subscribeToStream, getConfiguration } from "@kblocks/common";

const map: Record<string, any> = {};
const events: Array<any> = [];

const server = http.createServer();
const redis = new Redis({
  host: 'test-redis',
  port: 18284,
  password: 'pass1234',
});

const redisEvents = new Redis({
  host: 'test-redis',
  port: 18284,
  password: 'pass1234',
});

subscribeToStream(getConfiguration().channels.events, (message: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log(`Received message on events stream: ${message}`);

    const body = JSON.parse(message);
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
    }

    if (body.type === "PATCH") {
      const key = body.objUri;
      map[key] = {
        ...map[key] ?? {},
        ...body.patch,
      };
    }
    resolve();
  });
});

const controlChannel = "kblocks-events";
redisEvents.subscribe(controlChannel);
redisEvents.on("message", (channel, message) => {
  if (channel !== controlChannel) {
    console.log(`Received message on channel ${channel}: ${message}`);
    return;
  }

  
});

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
    
    return req.on("end", async () => {
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

      if (req.url === "/control") {
        console.log("Sending message to control client");
        const obj = JSON.parse(bodyString);
        const { system, group, version, plural } = obj;
        const channel = `kblocks-control:${group}/${version}/${plural}/${system}`;
        await redis.xadd(channel, "*", "message", bodyString);
        return res.end();
      }

      if (req.url === "/reset") {
        execSync('kubectl delete testresources --all --all-namespaces');
        console.log("testresources deleted");
        execSync('kubectl delete customresources --all --all-namespaces');
        console.log("customresources deleted");
        execSync('kubectl delete gitresources --all --all-namespaces');
        console.log("gitresources deleted");
        execSync('kubectl delete gitcontents --all --all-namespaces');
        console.log("gitcontents deleted");
        execSync('kubectl delete secrets --selector kblocks.io/system=test-system --all-namespaces');
        console.log("secrets deleted");
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

// Add shutdown signal handlers
process.on('SIGTERM', () => shutdownServer());
process.on('SIGINT', () => shutdownServer());

function shutdownServer() {
  console.log('Shutting down server...');
  process.exit(0);
}

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
