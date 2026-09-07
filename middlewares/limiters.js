import { rateLimit } from "express-rate-limit";

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    legacyHeaders: false,
    standardHeaders: 'draft-7',
    message: {
        error: "You have hit your limit of login route, try again after some minutes.."
    }
})

const registerRateLimit = rateLimit({
    windowMs: 1 * 60 * 60 * 1000,
    limit: 4,
    legacyHeaders: false,
    standardHeaders: 'draft-7',
    message: {
        error: "You have hit your limit for register route, try again after some minutes.."
    }
});

const verifyOTPRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 3,
    legacyHeaders: false,
    standardHeaders: 'draft-7',
    message: {
        error: "You have hit your limit for verify OTP route, try again after some minutes.."
    }
});

const standardRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    legacyHeaders: false,
    standardHeaders: 'draft-7',
    message: {
        error: "You have sent too many requests, wait some seconds to reset your limit..",
    }
});

export { loginRateLimit , registerRateLimit , standardRateLimit , verifyOTPRateLimit };