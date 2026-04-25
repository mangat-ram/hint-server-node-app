import https from "https";
import { User } from "./model";
import { AuthorizedRequest, ParameterizedRequest, QueryParameterizedRequest } from "../../services/request";
import { Request, Response } from "express";
import { sendFeedbackMail, sendMail } from "../../services/nodemailer";
import { sendOtp } from "../../services/sms";
import { blacklistedDoctorsUrl } from "../../config";
import axios from "axios";

const agent = new https.Agent({ rejectUnauthorized: false });// bypass SSL verification

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

const checkUniqueUser = async (req: ParameterizedRequest<{ email: string }>, res: Response) => {
  try {
    const { email } = req.params;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use." });
    }

    return res.status(200).json({ message: "Email is available." });
  } catch (error) {
    console.error("Error checking unique user:", error);
    throw error;
  }
}

const signUp = async (req: Request, res: Response) => {
  try {
    const { username, email, phoneNumber, isAdmin } = req.body;
    if (!username || !email || !phoneNumber) {
      return res.status(400).json({ message: "Username, email, and phone number are required." });
    } 
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(409).json({ message: "Email or phone number is already in use." });
    }

    // Generate a 6-digit random verification code
    const verifyCode = Math.floor(100000 + Math.random() * 900000);
  
    const userData = {
      username,
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

    return res.status(201).json({ user: resUser, accessToken, refreshToken });
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
}

const update = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    const { username, email, phoneNumber, address, city, state, pincode } = req.body;
    const updatedFields = { username, email, phoneNumber, address, city, state, pincode };
    await User.findByIdAndUpdate(user._id, updatedFields, { new: true });
    return res.status(200).json({ user: req.user, message: "User details updated successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: `Something went wrong: ${error.message}: Update Failed` });
  }
}

const signIn = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: "Email/Phone and password are required." });
    }
    const user = await User.findOne({ $or: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }] });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    } 
    if (user.password === "notAdded") {
      return res.status(403).json({ message: "Please complete sign up process first." });
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(404).json({ message: "password is incorrect" })
    }
  
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens((user._id).toString());
  
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken -verifyCode"
    )

    const options = { 
      httpOnly: true, 
      secure: true, 
      sameSite: "strict" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000 
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({ user: loggedInUser, accessToken, refreshToken, message: "Sign in successful." });
  } catch (error) {
    console.error("Error signing in:", error);
    return res.status(500).json({ message: "Internal Server Error: Sign in failed" });
  }
}

const signOut = async (req: AuthorizedRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { refreshToken: undefined } },
      { new: true }
    )
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({ success: true, message: "user logged out successfully." });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: `something went wrong in catch part error of logout : ${error}` })
  }
}

const getMe = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select("-password -refreshToken -verifyCode");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ message: "Internal Server Error: Failed to fetch user details" });
  }
}

const verifyOtp = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: "OTP is required." });
    }

    const user = req.user;
    const sourceOtp = user.verifyCode;
    if (sourceOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    return res.status(200).json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error: OTP verification failed" });
  }
}

const exists = async (req: QueryParameterizedRequest<{ email: string, phoneNumber: string }>, res: Response) => {
  try {
    const { email, phoneNumber } = req.query;
    if (!email && !phoneNumber) {
      return res.status(400).json({ message: "Email or phone number is required." });
    }

    const query: any = {};
    if (email) query.emailId = email;
    if (phoneNumber) query.phoneNumber = phoneNumber;

    const userExists = await User.findOne(query).select("_id verifyCode");
    if (!userExists) {
      return res
        .status(200)
        .json({ success: true, message: "User check successful", exists: false });
    }

    const otp = userExists.verifyCode;
    if (!otp) {
      return res.status(500).json({ success: false, message: "OTP not found for the user" });
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens((userExists._id).toString());
    if (email) {
      await sendMail(email, "OTP", otp);
      return res.status(200).json({ success: true, message: "OTP sent to the email successfully", exists: true, accessToken });
    } else if (phoneNumber) {
      await sendOtp(phoneNumber, otp);
      return res.status(200).json({ success: true, message: "OTP sent to the number successfully", exists: true, accessToken });
    }
  } catch (error) {
    console.error("Error checking user existence:", error);
    return res.status(500).json({ message: "Internal Server Error: Failed to check user existence" });
  }
}

const sendFeedback = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { query, name, email, text } = req.body;
    const feedbackData = { query, name, email, text };
    await sendFeedbackMail(
      "admin@hintbharat.com",
      "New User Feedback",
      feedbackData
    )
    return res.status(200).json({ success: true, message: "Feedback sent successfully." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: `Something went wrong: ${error.message}` });
  }
}

const deleteUser = async (req: AuthorizedRequest, res: Response) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ success: true, message: "User account deleted successfully." });
  } catch (error) {
    console.error("Error deleting user account:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error: Failed to delete user account" });
  } 
}

const getDoctorByRegistrationNumber = async (req: ParameterizedRequest<{ registrationNumber: string }>, res: Response) => {
  try {
    const { registrationNumber } = req.params;
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
      return res.status(200).json({ doctor: response.data[0], message: "Doctor details fetched successfully." });
    } else {
      return res.status(404).json({ message: "Doctor not found." });
    }
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    return res.status(500).json({ message: "Internal Server Error: Failed to fetch doctor details" });
  } 
}

export { 
  signUp, 
  signIn, 
  signOut,
  getMe,
  update, 
  checkUniqueUser
};