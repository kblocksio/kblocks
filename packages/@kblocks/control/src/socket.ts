import WebSocket from "ws";
import { EventEmitter } from "events";
export type MessageHandler = (message: string) => void;

export function connect(url: string) {
  const emitter = new EventEmitter();
  const pingPeriod = 10_000;
  let ws: WebSocket;


  function reconnect() {
    console.log(`Connecting to control channel: ${url}`);

    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("connection opened");
      emitter.emit("open");
    });

    ws.on("close", (code) => {
      console.log(`connection closed (code: ${code}), reconnecting in 1s`);
      setTimeout(reconnect, 1000);
    });

    ws.on("error", (err) => {
      console.log("connection error: ", err.message, ", closing connection");
      ws.close();
      console.log("reconnecting in 1s");
      setTimeout(reconnect, 1000);
    });

    ws.on("message", (data) => {
      emitter.emit("message", data.toString("utf-8"));
    });
  }

  const ping = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.ping((err: any) => {
      if (err) {
        console.log("Ping error:", err);
        ws.close();
        console.log("reconnecting in 1s");
        setTimeout(reconnect, 1000);  
      }
    });
  };

  const pingInterval = setInterval(ping, pingPeriod);
  

  reconnect();

  return {
    on: emitter.on.bind(emitter),
    close: () => {
      clearInterval(pingInterval);
      ws.close();
    },
  };
}
