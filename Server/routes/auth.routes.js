const express = require("express");
const router = express.Router();
const cookieparser = require("cookie-parser");
const authcontroller = require("../controllers/auth.controller");
const validator = require("../validators/auth.validator");
const {
    loginRateLimit,
    signupRateLimit,
    usernameCheckRateLimit
} = require("../middleware/auth-rate-limit");

router.use(express.json());
router.use(cookieparser());

router.post("/signup", signupRateLimit, validator.validateRegister, authcontroller.register);
router.get("/check-username", usernameCheckRateLimit, authcontroller.checkUsername);
router.get("/getme", authcontroller.getme);
router.post("/login", loginRateLimit, authcontroller.login)
router.post("/refresh-token", authcontroller.refreshToken);
router.post("/logout", authcontroller.logout);

module.exports = router;


router.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).send({
            message: "Invalid JSON format"
        });
    }

    next(err);
});