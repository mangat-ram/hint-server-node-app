import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { User } from "../user/model";
import { sendOtp } from "../../services/sms";
import { agent, generateAccessAndRefreshTokens } from "../user/controller";
import { accessTokenSecret, blacklistedDoctorsUrl } from "../../config";
import axios from "axios";

const generateVerifyCodeToken = (verifyCode: string, phoneNumber: string) => {
  return jwt.sign(
    { verifyCode, phoneNumber },
    accessTokenSecret,
    { expiresIn: "5m" }
  );
};

const sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body || {};
    if (!phoneNumber) {
      res.status(400).json({ success: false, message: "Phone number is required." });
      return;
    }

    // Generate a 6-digit random verification code
    const verifyCode = Math.floor(100000 + Math.random() * 900000);
    try {
      await sendOtp(phoneNumber, verifyCode.toString());
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ success: false, message: "Internal Server Error: Failed to send verification code" });
      return;
    }

    const token = generateVerifyCodeToken(verifyCode.toString(), phoneNumber);

    res.status(200).json({ success: true, message: "Verification code sent successfully.", token });
  } catch (error) {
    console.error("Error sending verification code:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Failed to send verification code" });
  }
}

const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    const { verifyCode, phoneNumber } = req.body;
    if (!verifyCode || !phoneNumber) {
      res.status(400).json({ success: false, message: "Verification code and phone number are required." });
      return;
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ success: false, message: "Authorization token is missing." });
      return;
    }

    let jwtPayload;
    try {
      jwtPayload = jwt
        .verify(token, accessTokenSecret) as { verifyCode: string; phoneNumber: string };
    } catch (error) {
      res.status(401).json({ success: false, message: "Invalid or expired verification token." });
      return;
    }

    const { verifyCode: verifyCodeToken, phoneNumber: phoneNumberToken } = jwtPayload;
    if (verifyCode.toString() !== verifyCodeToken || phoneNumber !== phoneNumberToken) {
      res.status(401).json({ success: false, message: "Invalid verification code." });
      return;
    }

    const userData = {
      phoneNumber,
      password: "notAdded",
      role: "doctor"
    }

    let user = await User.create(userData);
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens((user._id).toString());

    res.status(200).json({ success: true, message: "Verification code verified successfully.", accessToken, refreshToken });
  } catch (error) {
    console.error("Error verifying verification code:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Verification code verification failed" });
  }
}

const getDoctorsByRegistrationNumber = async (registrationNumber: string): Promise<Array<any>>  => {
  try {
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
    let doctors;
    const response = await axios.post( blacklistedDoctorsUrl, payload, headers);
    if (response.data && response.data.length > 0) {
      doctors = response.data;
      return doctors;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    throw new Error("Failed to fetch doctor details");
  }
}

const verifyAadharAndRegistration = async (aadharNumber: string, registrationNumber: string): Promise<boolean> => {
  try {
    // Implementation for verifying Aadhar and registration
    return true;
  } catch (error) {
    console.error("Error verifying Aadhar and registration:", error);
    throw new Error("Failed to verify Aadhar and registration");
  }
}

const verifyCreds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { aadharNumber, registrationNumber } = req.body || {};
    if (!aadharNumber || !registrationNumber) {
      res.status(400).json({ success: false, message: "Aadhar number and registration number are required." });
      return;
    }
    const isVerified = await verifyAadharAndRegistration(aadharNumber, registrationNumber);
    res.status(200).json({ success: true, message: "Credentials verified successfully.", isVerified });
  } catch (error) {
    console.error("Error verifying credentials:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Failed to verify credentials" });
  }
}

const submitVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    // Implementation for submitting video
    res.status(200).json({ success: true, message: "Video submitted successfully." });
  } catch (error) {
    console.error("Error submitting video:", error);
    res.status(500).json({ success: false, message: "Internal Server Error: Failed to submit video" });
  }
}

export {
  sendVerificationCode, 
  verify,
  verifyCreds,
  submitVideo
};