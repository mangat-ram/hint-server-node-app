import mongoose from "mongoose";
import { database, databaseUri } from "../../config";

export const connection = async (): Promise<void> => {
  try {
    const instance = await mongoose.connect(`${databaseUri}/${database}`);
    console.log(`\n MongoDB Connected Succesfully !! HOST:${instance.connection.host}`);
  } catch (error) {
    console.log("Connection Failed !! due to ",error);
    process.exit(1);
  }
};