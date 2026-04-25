import { Coupon } from "./model";
import { IUser, User } from "../user/model";
import { Request, Response } from "express";
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

const addCouponToUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestUser = (req as AuthorizedRequest).user as IUser;
    if (!requestUser) {
      res.status(401).json({ error: "Unauthorized" });
    }

    if(!requestUser.isAdmin) {
      res.status(403).json({ error: "Forbidden" });
    }

    const { couponName, userId } = req.body;
    if (!couponName || !userId) {
      res.status(400).json({ error: "Coupon name and user ID are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
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

    res.status(201).json({ message: "Coupon created and added to user", coupon: createdCoupon });
  } catch (error) {
    console.error("Error adding coupon to user:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

const generateCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    let existingCoupons = new Set(
      (await Coupon.find({}, "couponCode")).map((c) => c.couponCode)
    );

    let couponsToInsert = [];

    while (couponsToInsert.length < 10) {
      let newCouponCode;
      do {
        newCouponCode = generateCouponCode();
      } while (existingCoupons.has(newCouponCode));

      existingCoupons.add(newCouponCode);
      couponsToInsert.push({ couponCode: newCouponCode });
    }

    const createdCoupons = await Coupon.insertMany(couponsToInsert);

    res.status(201)
      .json({ success: true, message: "Coupons generated successfully", coupons: createdCoupons });
  } catch (error: any) {
    res.status(500)
      .json({ success: false, error: `Something went wrong at generateCoupons: ${error.message}` });
  }
}

const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const reqUser = (req as AuthorizedRequest).user;
  
    if (!reqUser) {
      res.status(401).json({success: false, error: "Unauthorized"})
    }
  
    if (reqUser.isAdmin === false) {
      res.status(403).json({ success: false, error: "Forbidden" })
    }
  
    const { couponName, userId } = req.body;
  
    if (!couponName || !userId) {
      res.status(400).json({ success: false, error: "Coupon name and user ID are required" })
    }
  
    const coupon = await Coupon.findOne({couponName});
    const user = await User.findById(userId);
  
    if (!coupon || !user) {
      res.status(404)
        .json({ success: false, error: "user and coupon not found,try with different id or coupon." })
    }
  
    await Coupon.findOneAndDelete({ couponName, couponOwner:userId })
  
    res.status(204).json({ success: true, message: "Coupon deleted successfully" })
  } catch (error: any) {
    res.status(500)
      .json({ success: false, error: `Something went wrong at deleteCoupon: ${error.message}` })
  }
}

export {
  addCouponToUser,
  generateCoupons,
  deleteCoupon
}