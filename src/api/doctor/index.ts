import { Router } from "express";
import { sendVerificationCode, submitVideo, verify, verifyCreds,  } from "./controller";
import { token } from "../../services/token";

const router = Router();

router.post("/send", sendVerificationCode);
router.post("/verify", verify);
router.post("/verifyCreds", token, verifyCreds);
router.post("/video", token, submitVideo);

export default router;