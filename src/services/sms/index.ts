import axios, { AxiosResponse } from "axios";
import {
  fast2smsKey,
  fast2smsUri,
  fast2smsId
} from "../../config";

// Define response type (adjust based on actual Fast2SMS response)
interface Fast2SMSResponse {
  return: boolean;
  request_id: string;
  message: string[];
}

export const sendOtp = async (
  phoneNumber: string,
  otp: string | number
): Promise<{ otpRes?: AxiosResponse<Fast2SMSResponse>; error?: Error }> => {
  try {
    const url = `${fast2smsUri}?authorization=${fast2smsKey}&route=dlt&sender_id=${fast2smsId}&message=176992&variables_values=${otp}%7C&flash=0&numbers=${phoneNumber}`;
    console.log("URL === ", url);
    const otpRes: AxiosResponse<Fast2SMSResponse> = await axios.get(url);

    return { otpRes };
  } catch (error: any) {
    console.error("Error sending OTP:", error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};