import express, { Request, Response } from "express";
import { apiVersion } from "../../config";
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

import userRoutes from "../../api/user";
import couponRoutes from "../../api/coupon";
import doctorRoutes from "../../api/doctor";

//API Routes
app.use(`${apiVersion}/users`, userRoutes);
app.use(`${apiVersion}/coupons`, couponRoutes);
app.use(`${apiVersion}/doctors`, doctorRoutes);

export default app;