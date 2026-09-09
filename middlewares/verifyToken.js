import jwt from "jsonwebtoken";
import { connectRedis, redisClient } from "../config/redis.js";
import { client } from "../config/prismaConnection.js";
import { tokenGeneration } from "../controllers/auth.controller.js";

const refreshToken = async (req , res , next) => {
    const token = req.cookies["access_token"] || null;

    try {
        const payload = jwt.verify(token , process.env.JWT_ACCESS_KEY, { 
            ignoreExpiration: true
        });

        if(!payload.userId || !payload.tokenId) return res.status(400).json({
            error: "Invalid ACCESS TOKEN was sent (Manipulated)",
            code: "INVALID-TOKEN"
        });

        const cacheKey = `users:${payload.userId}:${payload.tokenId}`;

        await connectRedis();

        const tokens = await redisClient.get(cacheKey);

        if(!tokens) return res.status(400).json({
            error: "No registered session for your token was found.",
            code: "INVALID-TOKEN"
        });

        const parsedTokens = JSON.parse(tokens);

        try {
            jwt.verify(parsedTokens.refersh_token , process.env.JWT_REFRESH_KEY);
        } catch(err) {
            if(err.name === 'TokenExpiredError') {
                res.clearCookie("access_token");
                return res.status(401).json({
                    error: "Refresh Token has expired!",
                    code: "SIGN-OUT"
                })
            }
        }

        if(parsedTokens.access_token !== token) return res.status(401).json({
            error: "The access token provided is invalid or has expired.",
            code: "INVALID-TOKEN"
        });

        const isBanned = await client.users.findFirst({
            where: {
                id: payload.userId
            },
            
            select: {
                banned: true,
                id: true,
                verified: true
            }
        });

        if(isBanned.banned) return res.status(403).json({
            error: "Your account is banned.",
            code: "BANNED"
        })

        if(!isBanned.verified) return res.status(403).json({
            error: "Your account is not verified.",
            code: "NOT-VERIFIED-ACCOUNT"
        })

        await tokenGeneration(res , {
            userId: isBanned.id,
            verified: isBanned.verified
        }, isBanned.id);

        req.user = {
            userId: isBanned.id,
            verified: isBanned.verified
        };

        next();

    } catch(err) {
        console.log(err);
        return res.status(400).json({
            error: "Oops! something went wrong while refreshing your token."
        })
    }
}

const verifyToken = async (req , res , next) => {
    const token = req.cookies["access_token"] || null;

    if(!token) return res.status(401).json({
        error: "No ACCESS TOKEN was sent (Unauthenticated)",
        code: "UNAUTHENTICATED-USER"
    });

    try {
        const payload = jwt.verify(token , process.env.JWT_ACCESS_KEY);

        const cacheKey = `users:${payload.userId}:${payload.tokenId}`;

        await connectRedis();

        const tokens = await redisClient.get(cacheKey);

        if(!tokens) return res.status(400).json({
            error: "No registered session for your token was found.",
            code: "INVALID-TOKEN"
        });

        req.user = payload;

        next();
    } catch(err) {
        console.log(err);
        if (err.name === 'TokenExpiredError') {
            await refreshToken(req , res , next);
        }else {
            res.status(400).json({
                error: "You may have manipulated with the Access Token"
            })
        }
    }
}

export default verifyToken;