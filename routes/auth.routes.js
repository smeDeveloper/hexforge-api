import express from "express";
import { login, register, verifyOTP } from "../controllers/auth.controller.js";
import { loginRateLimit, registerRateLimit , verifyOTPRateLimit } from "../middlewares/limiters.js";

const authRouter = express.Router();

authRouter.post("/register" , registerRateLimit , register)
authRouter.post("/login" , loginRateLimit , login);
authRouter.post("/verify-email" , verifyOTPRateLimit , verifyOTP);

export default authRouter;