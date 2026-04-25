import app from "./services/express";
import { port } from "./config";
import { connection } from "./services/mongodb";

const portValue = port || 4000; // Default to 3000 if port is not defined

async function startServer() {
  try {
    console.log("Connecting to database...");
    await connection();

    console.log("Starting server...");

    app.listen(portValue, () => {
      console.log(`Server running on http://localhost:${portValue}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();