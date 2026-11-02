const authService = require("../services/auth.service");
const userQueries = require('../queries/users.queries');
const { refreshCookieOptions } = require("../config/refresh-cookie");

async function register(req, res) {

    try {
        const result = await authService.register({
            name: req.body.name,
            phone: req.body.phone,
            username: req.body.username,
            password: req.body.password,
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        res.cookie("refreshtoken", result.refreshToken, {
            ...refreshCookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });


        res.status(201).json({
            user: {
                id: result.id,
                name: result.name,
                username: result.username,
                phone: result.phone
            },
            accessToken: result.accessToken
        });
    }

    catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : "Unable to create account."
        });
    }
}

async function checkUsername(req, res) {
    try {
        const username = typeof req.query.username === "string"
            ? req.query.username.trim()
            : "";

        if (!username || username.length < 3) {
            return res.status(400).json({
                available: false,
                message: "Username must be at least 3 characters."
            });
        }

        const available = await userQueries.isAvailable(username);

        return res.status(200).json({
            available: available,
        });
    }
    catch (err) {
        console.error("Username check failed:", err);

        return res.status(500).json({
            message: "Unable to check username."
        });
    }
}

async function login(req, res) {
    try {
        const result = await authService.login({
            username: req.body.username,
            phone: req.body.phone,
            password: req.body.password,
            ip: req.ip,
            userAgent: req.get("User-Agent")
        });

        if (!result.success) {
            return res.status(result.statusCode).json({
                success: false,
                message: result.message
            });
        }

        res.cookie("refreshtoken", result.refreshToken, {
            ...refreshCookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(result.statusCode).json({
            success: true,
            message: result.message,
            user: {
                id: result.id,
                name: result.name,
                username: result.username,
                phone: result.phone
            },
            accessToken: result.accessToken
        });

    } catch (error) {
        console.error("Login controller error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

async function getme(req, res) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const user = await authService.getme(accessToken);
        res.status(200).json({ user });
    }
    catch (error) {
        console.error(error);
        if (["TokenExpiredError", "JsonWebTokenError", "UnauthorizedError"].includes(error.name)) {
            return res.status(401).json({ error: error.message || "Invalid access token" });
        }
        res.status(500).json({ error: error.message || "Database error" });
    }
}

async function refreshToken(req, res) {
    const refreshToken = req.cookies.refreshtoken;
    if (!refreshToken) {
        return res.status(401).json({ error: "No refresh token provided" });
    }

    try {
        const result = await authService.refreshToken(refreshToken);

        res.cookie("refreshtoken", result.refreshToken, {
            ...refreshCookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.status(200).json({
            user: {
                name: result.user.name,
                username: result.user.username,
                phone: result.user.phone
            },
            accessToken: result.accessToken
        });
    }
    catch (error) {
        if (["TokenExpiredError", "JsonWebTokenError", "UnauthorizedError"].includes(error.name)) {
            return res.status(401).json({
                error: error.name === "TokenExpiredError"
                    ? "Refresh token expired"
                    : "Invalid refresh token"
            });
        }

        console.error(error);
        return res.status(500).json({
            error: error.message || "Database error"
        });
    }
}

async function logout(req, res) {
    const refreshToken = req.cookies.refreshtoken;
    if (!refreshToken) {
        return res.status(401).json({ error: "No refresh token provided" });
    }

    try {
        await authService.logout(refreshToken);
        res.clearCookie('refreshtoken', refreshCookieOptions);
        res.status(200).json({ message: "Logged out successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || "Database error" });
    }
}

module.exports = {
    register,
    checkUsername,
    login,
    getme,
    logout,
    refreshToken
};