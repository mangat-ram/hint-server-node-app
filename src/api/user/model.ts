import mongoose, { Schema, Document, Model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { accessTokenSecret, refreshTokenSecret } from "../../config";

/* =========================
   Interfaces
========================= */

export interface IUser extends Document {
  username: string;
  gender: "male" | "female" | "other" | "notAdded";
  dob: string;
  email: string;
  phoneNumber: string;
  institutionName: string;
  yearOfGraduation: string;
  yearOfRegistration: string;
  registrationNumber: string;
  password: string;
  verifyCode?: string;
  refreshToken?: string;
  role: "user" | "doctor" | "admin";
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
      trim: true
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dob: {
      type: String,
    },
    institutionName: {
      type: String,
      trim: true
    },
    yearOfGraduation: {
      type: String,
      trim: true
    },
    yearOfRegistration: {
      type: String,
      trim: true
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      unique: true
    },
    phoneNumber: {
      type: String,
      trim: true,
      required: [true, "phone number is required"],
      unique: true
    },
    password: {
      type: String,
      required: [true, "password is required"]
    },
    refreshToken: {
      type: String
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    verifyCode: {
      type: String
    },
    role: {
      type: String,
      enum: ["user", "doctor", "admin"],
      default: "user"
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
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