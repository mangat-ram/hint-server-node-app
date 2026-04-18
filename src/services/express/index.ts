import express, { Request, Response } from "express";
// import { port, apiVersion } from "../../config";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/ping", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "pong",
  });
});

export default app;