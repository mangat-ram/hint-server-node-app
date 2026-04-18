import mongoose, { Schema, Document, Model } from "mongoose";

/* =========================
   Interface
========================= */

export interface ICoupon extends Document {
  couponName: string;
  couponCode: string;
  couponOwner?: mongoose.Types.ObjectId;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ICouponModel extends Model<ICoupon> {}

/* =========================
   Schema
========================= */

const couponSchema = new Schema<ICoupon>(
  {
    couponName: {
      type: String,
      required: true,
      trim: true
    },
    couponCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    couponOwner: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    isUsed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/* =========================
   Model
========================= */

export const Coupon: ICouponModel = mongoose.model<ICoupon, ICouponModel>( "Coupon", couponSchema );