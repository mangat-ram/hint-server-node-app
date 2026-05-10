import { Router } from "express";
import { 
  checkUniqueUser, 
  exists, 
  getDoctorByRegistrationNumber, 
  getMe, 
  remove, 
  sendFeedback, 
  signIn, 
  signOut, 
  signUp, 
  update, 
  updatePartially, 
  verifyOtp 
} from "./controller";
import { token } from "../../services/token";

const router = Router();

router.post("/", signUp);
router.post("/login", signIn);
router.get("/email/:email", checkUniqueUser);
router.get("/exists", exists);
router.post("/feedback", sendFeedback)
router.get("/doctors/:registrationNumber", getDoctorByRegistrationNumber);

//Authenticated Routes
router.post("/logout", token, signOut);
router.get("/me", token, getMe);
router.post("/otp", token, verifyOtp);
router.put("/", token, update);
router.patch("/", token, updatePartially);
router.delete("/", token, remove);

export default router;