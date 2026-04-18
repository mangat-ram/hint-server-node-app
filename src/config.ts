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
export const accessTokenExpiry = requireProcessEnv("ACCESS_TOKEN_EXPIRY");
export const refreshTokenSecret = requireProcessEnv("REFRESH_TOKEN_SECRET");
export const refreshTokenExpiry = requireProcessEnv("REFRESH_TOKEN_EXPIRY");