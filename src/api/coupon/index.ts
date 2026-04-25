import { Router } from "express";
import { 
  addCouponToUser,
  generateCoupons,
  deleteCoupon
} from "./controller";
import { token } from "../../services/token";

const router = Router();

router.post("/", token, addCouponToUser);
router.post("/generate", generateCoupons);
router.delete("/", token, deleteCoupon);

export default router;