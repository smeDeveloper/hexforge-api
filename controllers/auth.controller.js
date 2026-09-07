import crypto from "node:crypto";
import { v4 as uuid } from "uuid";
import { userLoginSchema, userSchema } from "../schemas/user.schema.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { client } from "../config/prismaConnection.js";
import { connectRedis, redisClient } from "../config/redis.js";
import transporter from "../config/mailer.js";
import { OTPVerificationSchema } from "../schemas/OTPVerification.schema.js";

export const COOKIES_OPTIONS = {
    sameSite: "strict",
    path: "/",
    secure: true,
    httpOnly: true
}

export const tokenGeneration = async (res , payload = {} , userId) => {
    const tokenId = uuid();

    payload = {
        ...payload,
        token_id: tokenId
    }

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_KEY, {
        expiresIn: "15m"
    })

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_KEY, {
        expiresIn: "15d"
    });

    const cacheKey = `users:${userId}:${tokenId}`;

    const cacheValue = {
        access_token: accessToken,
        refresh_token: refreshToken
    }

    try {
        await connectRedis();
        await redisClient.setEx(cacheKey , 15 * 24 * 60 * 60 , JSON.stringify(cacheValue));
    } catch(err) {
        console.log(err);
    }

    res.cookie("access_token" , accessToken , {
        ...COOKIES_OPTIONS,
        maxAge: 900000
    });
}

const sendOTPEmail = async (toEmail, otpCode) => {
    const mailOptions = {
      from: `sme.dev212@gmail.com`,
      to: toEmail,
      subject: "Your Account Verification Code",
      text: `Your verification code is: ${otpCode}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Verify Your Account</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #4CAF50; letter-spacing: 2px;">${otpCode}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    };
  
    await transporter.sendMail(mailOptions);
};

const register = async (req , res) => {
    const { data } = req.body;
    try {
        const userDataValidation = userSchema.safeParse({
            ...data,
            id: uuid(),
            verified: false,
            createdAt: new Date()
        });

        if(!userDataValidation.success) return res.status(400).json({
            error: "Invalid data was sent!"
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userDataValidation.data.password , salt);

        let OTP = crypto.randomInt(100000, 999999).toString();;

        const codeExpiration = new Date(new Date().getTime() + (10 * 60 * 1000));

        await client.users.create({
            data: {
                ...userDataValidation.data,
                password: hashedPassword,
                verification_codes: {
                    create: {
                        code: OTP,
                        expiresAt: codeExpiration
                    }
                }
            },
            include: {
                verification_codes: true
            }
        });

        await sendOTPEmail(userDataValidation.data.email , OTP);

        res.status(201).json({
            message: "You have registered successfully, now go and check your email for the verification code",
            success: true,
        })
    } catch(err) {
        if(err.code === "P2002") {
            const targetField = err.meta?.target;
            return res.status(409).json({
                error: `Sorry, but ${targetField || "username or email"} is already registered.`,
                code: "ALREADY-REGISTERED",
            })
        }else {
            console.log(err);
            return res.status(500).json({
                error: "Oops! something went wrong, try again now or later.",
                code: "INTERNAL-SERVER-ERROR",
            })
        }
    }
}

const login = async (req , res) => {
    const { data } = req.body;

    try {
        const validateLoginData = userLoginSchema.safeParse(data);

        if(!validateLoginData.success) return res.status(400).json({
            error: "Invalid login data was sent!",
        });

        const user = await client.users.findFirst({
            where: {
                email: validateLoginData.data.email
            },
            include: {
                verification_codes: true
            },
        });

        if(!user) return res.status(400).json({
            error: "Invalid email or password"
        })

        const passwordMatches = await bcrypt.compare(validateLoginData.data.password , user.password);

        if(!passwordMatches) return res.status(400).json({
            error: "Invalid email or password"
        })

        const sendOTP = async () => {
            let OTP = crypto.randomInt(100000, 999999).toString();;
            const codeExpiration = new Date(new Date().getTime() + (10 * 60 * 1000));

            await client.verification_codes.create({
                data: {
                    code: OTP,
                    user: user.email,
                    expiresAt: codeExpiration
                },
            })

            try {
                await sendOTPEmail(user.email , OTP);
            } catch(err) {
                return {
                    error: "Oops! something went wrong, try again now or later."
                }
            }
        }

        if(!user.verified) {
            if(user.verification_codes) {
                if(new Date(user.verification_codes.expiresAt).getTime() > new Date().getTime()) {
                    return res.status(401).json({
                        error: "You are not verified and have a code that hasn't expired yet, so get it.",
                        code: "NOT-VERIFIED",
                    })
                }else {
                    await client.verification_codes.delete({
                        where: {
                            id: user.verification_codes.id
                        }
                    });
                    let result = await sendOTP() || { error: null };
                    if(result.error) return res.status(400).json({
                        error: result.error
                    })
                    return res.status(400).json({
                        error: "You are not verified and we've sent a code to your email, go and get it.",
                        code: "NOT-VERIFIED",
                    })
                }
            }else {
                let result = await sendOTP() || { error: null };
                if(result.error) return res.status(400).json({
                    error: result.error
                })
                return res.status(400).json({
                    error: "You are not verified and we've sent a code to your email, go and get it.",
                    code: "NOT-VERIFIED",
                })
            }
        }

        await tokenGeneration(res , {
            userId: user.id,
            verified: user.verified
        }, user.id);

        res.status(200).json({
            message: "You've logged in successfully!",
            success: true,
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            error: "Oops! something went wrong, try again now or later."
        })
    }
}

const verifyOTP = async (req , res) => {
    const { data } = req.body;

    try {
        const validateOTPData = OTPVerificationSchema.safeParse(data);

        if(!validateOTPData.success) return res.status(400).json({
            error: "Invalid OTP data was sent!",
        });

        const otp = await client.verification_codes.findFirst({
            where: {
                user: validateOTPData.data.user,
                code: validateOTPData.data.code,
            },
            include: {
                Users: true
            }
        });

        if(!otp) return res.status(400).json({
            error: "Invalid OTP!",
            code: "INVALID-OTP",
        });

        if(new Date(otp.expiresAt).getTime() < new Date().getTime()) {
            await client.verification_codes.delete({
                where: {
                    id: otp.id
                }
            });

            let OTP = crypto.randomInt(100000, 999999).toString();;
            const codeExpiration = new Date(new Date().getTime() + (10 * 60 * 1000));

            await client.verification_codes.create({
                data: {
                    code: OTP,
                    user: otp.user,
                    expiresAt: codeExpiration
                }
            });
            
            try {
                await sendOTPEmail(otp.user, OTP);
            } catch(err) {
                return res.status(400).json({
                    error: "Oops! something went wrong, try again now or later.",
                    code: "SEND-OTP-ERROR",
                });
            }
            return res.status(400).json({
                error: "OTP has expired!, we've sent a new code to your email, go and get it.",
                code: "EXPIRED-OTP",
            });
        }

        await client.users.update({
            where: {
                email: otp.user
            },
            data: {
                verified: true
            }
        });

        await client.verification_codes.delete({
            where: {
                id: otp.id
            }
        });

        await tokenGeneration(res , {
            userId: otp.user.id,
            verified: true
        }, otp.user.id);

        return res.status(200).json({
            message: "You have verified your account successfully!",
            success: true,
        });
    } catch(err) {
        console.log(err);
        res.status(500).json({
            error: "Oops! something went wrong, try again now or later."
        })
    }
}

export { register , login , verifyOTP };