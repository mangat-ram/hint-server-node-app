import jwt from "jsonwebtoken";
import { IAccessTokenPayload, User } from "../../api/user/model";
import { Request, Response, NextFunction } from "express";
import { accessTokenSecret } from "../../config";
import { AuthorizedRequest } from "../../services/request";

const token = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    // req.cookies?.accessToken ||

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const decodedToken = jwt.verify(token, accessTokenSecret) as IAccessTokenPayload;
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    (req as AuthorizedRequest).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export {
  token
}