export const endpoints = {
  events: process.env.KBLOCKS_EVENTS_URL ?? "https://api.kblocks.io/api/events",
  control: process.env.KBLOCKS_CONTROL_URL ?? "wss://api.kblocks.io/api/control",
};