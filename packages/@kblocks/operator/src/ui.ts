import express from "express";
import Redis from "ioredis";

export const createUI = (workerCount: number, redisClient: Redis) => {
  const app = express();
  
  app.get("/admin/streams", async (req, res) => {
    try {
      const streams = [];
      for (let i = 0; i < workerCount; i++) {
        const streamName = `worker-${i}`;
        const streamInfo = await redisClient.xinfo("STREAM", streamName);
        
        // Get the last 10 items from the stream
        const items = await redisClient.xrevrange(streamName, "+", "-", "COUNT", 10);
        
        const objects = items.map(item => JSON.parse(item[1][1]));
        
        streams.push({
          name: streamName,
          info: streamInfo,
          objects: objects
        });
      }
      
      // Generate HTML
      let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Worker Streams</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #2c3e50;
            }
            .stream {
              background-color: #f4f4f4;
              border-radius: 5px;
              padding: 15px;
              margin-bottom: 20px;
            }
            .stream h2 {
              margin-top: 0;
              color: #3498db;
            }
            .object {
              background-color: #fff;
              border: 1px solid #ddd;
              border-radius: 3px;
              padding: 10px;
              margin-top: 10px;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <h1>Worker Streams</h1>
      `;

      streams.forEach(stream => {
        html += `
          <div class="stream">
            <h2>${stream.name}</h2>
            <p>Queue Info: ${JSON.stringify(stream.info, null, 2)}</p>
            <h3>Recent Objects:</h3>
        `;
        stream.objects.forEach(obj => {
          html += `
            <div class="object">
              <pre>${JSON.stringify(obj, null, 2)}</pre>
            </div>
          `;
        });
        html += `</div>`;
      });

      html += `
        </body>
        </html>
      `;

      res.send(html);
    } catch (error) {
      console.error('Error fetching stream info:', error);
      res.status(500).send('<h1>Internal Server Error</h1><p>Error fetching stream info.</p>');
    }
  });
  // other configurations of your server
  
  app.listen(3000, () => {
    console.log("Running on 3000...");
    console.log("For the UI, open http://localhost:3000/admin/queues");
    console.log("Make sure Redis is running on port 6379 by default");
  });
};  