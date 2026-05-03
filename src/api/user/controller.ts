import https from "https";
import { User } from "./model";
import { AuthorizedRequest, ParameterizedRequest, QueryParameterizedRequest } from "../../services/request";
import { Request, Response } from "express";
import { sendFeedbackMail, sendMail } from "../../services/nodemailer";
import { sendOtp } from "../../services/sms";
import { blacklistedDoctorsUrl } from "../../config";
import axios from "axios";

export const agent = new https.Agent({ rejectUnauthorized: false });// bypass SSL verification

const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
  
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
  
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw error;
  }
}

const checkUniqueUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = (req as ParameterizedRequest<{ email: string }>).params;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: "Email is already in use." });
    }

    res.status(200).json({ success: true, message: "Email is available." });
  } catch (error) {
    console.error("Error checking unique user:", error);
    res.status(500).json({ success: false, message: "Error checking email availability." });
  }
}

const signUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, phoneNumber, isAdmin } = req.body;
    if (!email && !phoneNumber) {
      res.status(400).json({ success: false, message: "Either email or phone number is required." });
    } 
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      res.status(409).json({ success: false, message: "Email or phone number is already in use." });
    }

    // Generate a 6-digit random verification code
    const verifyCode = Math.floor(100000 + Math.random() * 900000);
  
    const userData = {
      username: username || "notAdded",
      email: email || "notAdded",
      phoneNumber: phoneNumber || "notAdded",
      password: "notAdded",
      verifyCode,
      address: "notAdded",
      city: "notAdded",
      state: "notAdded",
      pincode: "notAdded",
      isAdmin: isAdmin === true ? true : false
    }
    let user = await User.create(userData);
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens((user._id).toString());
    const resUser = await User.findById(user._id).select("-password -refreshToken -verifyCode");
    // Send OTP via email & SMS
    if(email) {
      await sendMail(email, "Your OTP Code", `Your OTP is: ${verifyCode}`);
    } else if (phoneNumber) {
      await sendOtp(phoneNumber, verifyCode);
    }

    res.status(201).json({ user: resUser, accessToken, refreshToken });
  } catch (error) {
    console.error("Error signing up:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Sign up failed" });
  }
}

const update = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthorizedRequest).user;
    const { username, email, phoneNumber, address, city, state, pincode } = req.body;
    const updatedFields = { username, email, phoneNumber, address, city, state, pincode };
    const updatedUser = await User.findByIdAndUpdate(user._id, updatedFields, { new: true });
    res.status(200).json({ success: true, message: "User details updated successfully.", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Something went wrong: ${error.message}: Update Failed` });
  }
}

const updatePartially = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthorizedRequest).user;

    const allowedFields = [
      "username",
      "email",
      "phoneNumber",
      "gender",
      "dob",
      "institutionName",
      "yearOfGraduation",
      "yearOfRegistration",
      "registrationNumber",
      "address",
      "city",
      "state",
      "pincode"
    ];

    // Build dynamic update object
    const updates: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Nothing to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update"
      });
    }

    // Update only provided fields
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    ).select("-password -refreshToken -verifyCode");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Something went wrong: ${error.message}`
    });
  }
};

const signIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      res.status(400).json({ success: false, message: "Email/Phone and password are required." });
    }
    const user = await User.findOne({ $or: [{ email: emailOrPhone.email }, { phoneNumber: emailOrPhone.phoneNumber }] });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    } 
    if (user.password === "notAdded") {
      res.status(403).json({ success: false, message: "Please complete sign up process first." });
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Incorrect password." });
      return;
    }
  
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens((user._id).toString());
  
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken -verifyCode"
    )

    // Cookies logic is commented out for now, can be enabled if needed. If enabled, make sure to set the cookies in the frontend as well and handle them securely.
    // const options = { 
    //   httpOnly: true, 
    //   secure: true, 
    //   sameSite: "strict" as const,
    //   maxAge: 7 * 24 * 60 * 60 * 1000 
    // };
    //   .cookie("refreshToken", refreshToken, options)
    //   .cookie("accessToken", accessToken, options)

    res.status(200)
      .json({ success: true, message: "Sign in successful.", user: loggedInUser, accessToken, refreshToken });
  } catch (error) {
    console.error("Error signing in:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Sign in failed" });
  }
}

const signOut = async (req:Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthorizedRequest).user;
    await User.findByIdAndUpdate(
      user._id,
      { $set: { refreshToken: undefined } },
      { new: true }
    )
  
    // If using cookies, clear them here. Make sure to set the same options as when they were set.
    // const options = {
    //   httpOnly: true,
    //   secure: true
    // }
    // .clearCookie("accessToken", options)
    // .clearCookie("refreshToken", options)
  
    res.status(200)
      .json({ success: true, message: "user logged out successfully." });
  } catch (error) {
    res.status(400)
      .json({ success: false, message: `something went wrong in catch part error of logout : ${error}` })
  }
}

const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthorizedRequest).user._id;
    const user = await User.findById(userId).select("-password -refreshToken -verifyCode");
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal Server Error: Failed to fetch user details" });
  }
}

const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ message: "OTP is required." });
      return;
    }

    const user = (req as AuthorizedRequest).user;
    const sourceOtp = user.verifyCode;
    if (sourceOtp !== otp) {
      res.status(401).json({ success: false, message: "Incorrect OTP." });
      return;
    }

    res.status(200).json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: OTP verification failed" });
  }
}

const exists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phoneNumber } = (req as QueryParameterizedRequest<{ email: string, phoneNumber: string }>).query;
    if (!email && !phoneNumber) {
      res.status(400).json({ success: false, message: "Email or phone number is required." });
      return;
    }

    const query: any = {};
    if (email) query.email = email;
    if (phoneNumber) query.phoneNumber = phoneNumber;

    const userExists = await User.findOne(query).select("_id verifyCode");
    if (!userExists) {
      res.status(200).json({ success: true, message: "User check successful", exists: false });
      return;
    }

    const otp = userExists.verifyCode;
    if (!otp) {
      res.status(500).json({ success: false, message: "OTP not found for the user" });
      return;
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens((userExists._id).toString());
    if (email) {
      await sendMail(email, "OTP", otp);
      res.status(200).json({ success: true, message: "OTP sent to the email successfully", exists: true, accessToken });
    } else if (phoneNumber) {
      await sendOtp(phoneNumber, otp);
      res.status(200).json({ success: true, message: "OTP sent to the number successfully", exists: true, accessToken });
    }
  } catch (error) {
    console.error("Error checking user existence:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Failed to check user existence" });
  }
}

const sendFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, name, email, text } = req.body;
    const feedbackData = { query, name, email, text };
    await sendFeedbackMail(
      "admin@hintbharat.com",
      "New User Feedback",
      feedbackData
    )
    res.status(200).json({ success: true, message: "Feedback sent successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
  }
}

const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthorizedRequest).user._id;
    await User.findByIdAndDelete(userId);
    res.status(204).json({ success: true, message: "User account deleted successfully." });
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Failed to delete user account" });
  } 
}

const getDoctorByRegistrationNumber = async (req: Request, res: Response): Promise<void>  => {
  try {
    const { registrationNumber } = (req as ParameterizedRequest<{ registrationNumber: string }>).params;
    const payload = {
      smcs: "",
      regnNo: registrationNumber.toString(),        // dynamic value
      suspendDate: "",
      restorDate: ""
    }
    const headers = {
      httpsAgent: agent,
      headers: {
        "Content-Type": "application/json"
      }
    }
    const response = await axios.post( blacklistedDoctorsUrl, payload, headers);
    if (response.data && response.data.length > 0) {
      res.status(200).json({ success: true, doctor: response.data[0], message: "Doctor details fetched successfully." });
    } else {
      res.status(404).json({ success: false, message: "Doctor not found." });
    }
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Failed to fetch doctor details" });
  } 
}

export { 
  signUp, 
  signIn, 
  signOut,
  getMe,
  update, 
  checkUniqueUser,
  exists,
  remove,
  verifyOtp,
  sendFeedback,
  getDoctorByRegistrationNumber,
  generateAccessAndRefreshTokens,
  updatePartially
};