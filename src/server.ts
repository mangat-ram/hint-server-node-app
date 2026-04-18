import app from "./services/express";
import { port } from "./config";
import { connection } from "./services/mongodb";

async function startServer() {
  try {
    console.log("Connecting to database...");
    await connection();

    console.log("Starting server...");

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();