import http from 'http';

const map: Record<string, any> = {};

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(map));
  }

  if (req.method === "POST" && req.url === "/events") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });
    
    return req.on("end", () => {
      console.log("Received:", body);

      try {
        const event = JSON.parse(body);
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
        console.error(`Error parsing event <${body}>: ${err}`);
      }
  
      return res.end("OK");
    });
  }

  res.statusCode = 404;
  return res.end();
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
