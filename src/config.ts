import dotenv from "dotenv";

dotenv.config();

const requireProcessEnv = (key: string): string => {
  if (!process.env[key]) {
    throw new Error(`You must set the ${key} environment variable`);
  }
  return process.env[key] as string;
};

export const port = requireProcessEnv("PORT");
export const apiVersion = requireProcessEnv("API_VERSION");
export const databaseUri = requireProcessEnv("DATABASE_URI");
export const database = requireProcessEnv("DATABASE");
export const accessTokenSecret = requireProcessEnv("ACCESS_TOKEN_SECRET");
export const refreshTokenSecret = requireProcessEnv("REFRESH_TOKEN_SECRET");
export const mailUsername = requireProcessEnv("MAIL_USER");
export const mailPassword = requireProcessEnv("MAIL_PASS");
export const fast2smsKey = requireProcessEnv("FAST2SMS_KEY");
export const fast2smsUri = requireProcessEnv("FAST2SMS_URI");
export const fast2smsId = requireProcessEnv("FAST2SMS_ID");
export const blacklistedDoctorsUrl = requireProcessEnv("BLACKLISTED_DOCTORS_URL");