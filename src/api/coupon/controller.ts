import { Coupon } from "./model";
import { IUser, User } from "../user/model";
import { Response } from "express";
import { AuthorizedRequest } from "../../services/request";

function generateCouponCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let coupon = '';
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    coupon += characters[randomIndex];
  }
  return coupon;
}

function createUniqueCoupon(existingCoupons: Set<string>): string {
  let newCoupon;
  do {
    newCoupon = generateCouponCode();
  } while (existingCoupons.has(newCoupon)); // Check if the code already exists

  existingCoupons.add(newCoupon); // Add the new coupon to the set
  return newCoupon;
}

const addCouponToUser = async (req: AuthorizedRequest, res: Response) => {
  try {
    const requestUser = req.user as IUser;
    if (!requestUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if(!requestUser.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { couponName, userId } = req.body;
    if (!couponName || !userId) {
      return res.status(400).json({ error: "Coupon name and user ID are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let couponCode: string;

    do {
      couponCode = generateCouponCode();
      var existedCode = await Coupon.findOne({ couponCode });
    } while (existedCode);

    const couponObj = {
      couponName,
      couponCode,
      couponOwner: userId
    }

    const createdCoupon = await Coupon.create(couponObj);

    return res.status(201).json({ message: "Coupon created and added to user", coupon: createdCoupon });
  } catch (error) {
    console.error("Error adding coupon to user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}