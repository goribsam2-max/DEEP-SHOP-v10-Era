import { app, initializeAppAsync } from '../server.js';

let initialized = false;

export default async function handler(req: any, res: any) {
  try {
    if (!initialized) {
      await initializeAppAsync();
      initialized = true;
    }
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Serverless Function Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error?.message || String(error),
      });
    }
  }
}
