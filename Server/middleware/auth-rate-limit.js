const { rateLimit } = require("express-rate-limit");

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Try again in 15 minutes." }
});

const signupRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many account creation attempts. Try again in 15 minutes." }
});

const usernameCheckRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many username checks. Try again in 15 minutes." }
});

module.exports = { loginRateLimit, signupRateLimit, usernameCheckRateLimit };
