import express from "express";
import Queue from "bull";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";

export const createUI = (queue: Queue.Queue) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  
  const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [new BullAdapter(queue)],
    serverAdapter: serverAdapter,
  });
  
  const app = express();
  
  app.use("/admin/queues", serverAdapter.getRouter());
  
  // other configurations of your server
  
  app.listen(3000, () => {
    console.log("Running on 3000...");
    console.log("For the UI, open http://localhost:3000/admin/queues");
    console.log("Make sure Redis is running on port 6379 by default");
  });
};  