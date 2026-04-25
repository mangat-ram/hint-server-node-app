import mongoose, { Schema, Document, Model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { accessTokenSecret, refreshTokenSecret } from "../../config";

/* =========================
   Interfaces
========================= */

export interface IUser extends Document {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  verifyCode?: string;
  refreshToken?: string;
  isAdmin: boolean;
  address: string;
  city: string;
  state: string;
  pincode: string;
  coupons: mongoose.Types.ObjectId[];

  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

interface IUserModel extends Model<IUser> {}

export interface IAccessTokenPayload {
  _id: string;
  email: string;
  username: string;
  verifyCode?: string;
}

/* =========================
   Schema
========================= */

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, "password is required"]
    },
    verifyCode: {
      type: String
    },
    refreshToken: {
      type: String
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    coupons: [
      {
        type: Schema.Types.ObjectId,
        ref: "Coupon"
      }
    ]
  },
  { timestamps: true }
);

/* =========================
   Middleware
========================= */

userSchema.pre("save", async function (next) {
  const user = this as IUser;

  if (!user.isModified("password")) return next();

  user.password = await bcrypt.hash(user.password, 10);
  next();
});

/* =========================
   Methods
========================= */

userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {

  const accessTokenPayload: IAccessTokenPayload = {
    _id: this._id,
    email: this.email,
    username: this.username,
    verifyCode: this.verifyCode
  };

  return jwt.sign(
    accessTokenPayload,
    accessTokenSecret,
    { expiresIn: "1d" }
  );
};

userSchema.methods.generateRefreshToken = function (): string {

  const refreshTokenPayload = {
    _id: this._id
  };

  return jwt.sign(
    refreshTokenPayload,
    refreshTokenSecret,
    { expiresIn: "7d" }
  );
};

/* =========================
   Model
========================= */

export const User: IUserModel = mongoose.model<IUser, IUserModel>( "User", userSchema );