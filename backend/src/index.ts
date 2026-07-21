// VERCEL SERVERLESS ENTRY POINT
// Old server-start code is commented out below.

import "dotenv/config";
import serverless from "serverless-http";
import app from "./app";
import { connectDB } from "./db";

let isConnected = false;

async function ensureDbConnected() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}

export const handler = serverless(async (req: any, res: any) => {
  await ensureDbConnected();
  app(req, res);
});

// --- OLD SERVER CODE (kept for reference) ---
// import http from "http";
// import app from "./app";
// import { connectDB } from "./db";
//
// const server = http.createServer(app);
//
// const port = process.env.PORT || 3000;
//
// const main = async (): Promise<void> => {
//   try {
//     await connectDB();
//     server.listen(port, () => {
//       console.log(`Server running on port ${port}`);
//     });
//   } catch (error) {
//     console.log("Database Error");
//     console.log(error);
//   }
// };
//
// main();
