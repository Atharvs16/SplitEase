const bcrypt = require('bcrypt');
const crypto = require("crypto");
const jwt = require('jsonwebtoken');

const userQueries = require('../queries/users.queries');
const sessionQueries = require('../queries/sessions.queries');
const db = require('../config/db');

const config = require('../config/config');

function hashRefreshToken(token) {
    return `sha256:${crypto.createHash("sha256").update(token).digest("hex")}`;
}

async function matchesRefreshToken(token, storedHash) {
    if (storedHash?.startsWith("sha256:")) {
        const expected = Buffer.from(storedHash.slice("sha256:".length), "hex");
        const actual = Buffer.from(hashRefreshToken(token).slice("sha256:".length), "hex");
        return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }

    return storedHash ? bcrypt.compare(token, storedHash) : false;
}

async function register({ name, phone, username, password, ip, userAgent }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const client = await db.connect();
    try{
        await client.query("BEGIN");
        const user = await userQueries.createUser(
            name,
            phone,
            username,
            passwordHash,
            client
        );

        const session = await sessionQueries.createSession(
            user.id,
            null,
            ip,
            userAgent,
            client
        );
        
        const refreshToken = jwt.sign(
            {
                userId: user.id,
                sessionId: session.id,
                jti: crypto.randomUUID()
            },
            config.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );
    
        const refreshTokenHash = hashRefreshToken(refreshToken);

        await sessionQueries.updateSessionRefreshToken(
            session.id,
            refreshTokenHash,
            client
        );
    
        const accessToken = jwt.sign(
            {
                userId: user.id,
                sessionId: session.id
            }, config.JWT_SECRET, { expiresIn: '15m' }
        );

        await client.query("COMMIT");
    
        return {
            id: user.id,
            name: user.name,
            username: user.username,
            phone: user.phone,
            accessToken,
            refreshToken
        };

    }

    catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Failed to roll back registration:", rollbackError);
        }
        if (error.code === "23505") {
            const conflict = new Error(
                error.constraint?.toLowerCase().includes("phone")
                    ? "That phone number is already registered."
                    : "That username is already taken."
            );
            conflict.statusCode = 409;
            throw conflict;
        }
        throw error;
    } finally {
        client.release();
    }
}


async function login({ username, phone, password, ip, userAgent }) {
    try {
        if ((!username && !phone) || (username && phone)) {
            return {
                statusCode: 400,
                success: false,
                message: "Provide either username or phone, not both."
            };
        }
        if (typeof password !== "string" || !password.trim()) {
            return {
                statusCode: 400,
                success: false,
                message: "Password is required."
            };
        }
        if ((username !== undefined && typeof username !== "string") || (phone !== undefined && typeof phone !== "string")) {
            return {
                statusCode: 400,
                success: false,
                message: "Invalid login credentials format."
            };
        }
        
        const identifier = username
            ? username.trim()
            : phone.trim();

        if (!identifier) {
            return {
                statusCode: 400,
                success: false,
                message: "Username or phone is required."
            };
        }

        
        const user = username
            ? await userQueries.getUserByUsername(identifier)
            : await userQueries.getUserByPhone(identifier);

        if (!user || !user.password_hash) {
            return {
                statusCode: 401,
                success: false,
                message: "Invalid username/phone or password."
            };
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return {
                statusCode: 401,
                success: false,
                message: "Invalid username/phone or password."
            };
        }

        // Add account-status checks here if your app supports them.
        // For example, disabled or unverified accounts.

        const session = await sessionQueries.createSession(
            user.id,
            null,
            ip,
            userAgent
        );

        const refreshToken = jwt.sign(
            {
                userId: user.id,
                sessionId: session.id,
                jti: crypto.randomUUID()
            },
            config.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );
    
        const refreshTokenHash = hashRefreshToken(refreshToken);

        await sessionQueries.updateSessionRefreshToken(
            session.id,
            refreshTokenHash
        );
    
        const accessToken = jwt.sign(
            {
                userId: user.id,
                sessionId: session.id
            }, config.JWT_SECRET, { expiresIn: '15m' }
        );
    
        return {
            statusCode: 200,
            success: true,
            message: "Login successful.",
            id: user.id,
            name: user.name,
            phone: user.phone,
            username: user.username,
            accessToken,
            refreshToken
        };

    } catch (err) {
        console.error("Login error:", err);

        return {
            statusCode: 500,
            success: false,
            message: "An unexpected error occurred."
        };
    }
}

async function getme(accessToken) {
    try{
        const decoded = jwt.verify(accessToken, config.JWT_SECRET);

        if (!decoded) {
            throw new Error("Invalid token");
        }
        
        const session = await sessionQueries.getSessionById(decoded.sessionId, decoded.userId);
        if (!session || session.revoked) {
            const error = new Error("Session is revoked or not found");
            error.name = "UnauthorizedError";
            throw error;
        }
        const user = await userQueries.getUserById(decoded.userId);
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    catch (error) {
        if (!["TokenExpiredError", "JsonWebTokenError", "UnauthorizedError"].includes(error.name)) {
            console.error(error);
        }
        throw error;
    }
}

async function refreshToken(refreshToken) {
    try{
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
        if (!decoded) {
            throw new Error("Invalid refresh token");
        }

        const sessionResult = await sessionQueries.getSessionById(decoded.sessionId, decoded.userId);
        if (sessionResult === undefined || sessionResult === null) {
            const error = new Error("Session not found.");
            error.name = "UnauthorizedError";
            throw error;
        }

        const session = sessionResult;
        if(session.revoked) {
            const error = new Error("Session is revoked.");
            error.name = "UnauthorizedError";
            throw error;
        }

        const isValidRefreshToken = await matchesRefreshToken(
            refreshToken,
            session.refresh_token_hash
        );
        if (!isValidRefreshToken) {
            const error = new Error("Invalid refresh token.");
            error.name = "UnauthorizedError";
            throw error;
        }

        const user = await userQueries.getUserById(decoded.userId);
        if (!user) {
            const error = new Error("User no longer exists.");
            error.name = "UnauthorizedError";
            throw error;
        }

        const nextRefreshToken = jwt.sign({
            userId: decoded.userId,
            sessionId: session.id,
            jti: crypto.randomUUID()
        }, config.JWT_SECRET, { expiresIn: "7d" });
        const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);
        const rotated = await sessionQueries.rotateSessionRefreshToken(
            session.id,
            session.refresh_token_hash,
            nextRefreshTokenHash
        );
        if (!rotated) {
            const error = new Error("Refresh token has already been used.");
            error.name = "UnauthorizedError";
            throw error;
        }
        
        const newAccessToken = jwt.sign({
            userId: decoded.userId,
            sessionId: session.id
        }, config.JWT_SECRET, { expiresIn: '15m' });
        
        return {
            user: {
                name: user.name,
                username: user.username,
                phone: user.phone
            },
            accessToken: newAccessToken,
            refreshToken: nextRefreshToken
        };
    }
    catch (error) {
        if (!["TokenExpiredError", "JsonWebTokenError", "UnauthorizedError"].includes(error.name)) {
            console.error(error);
        }
        throw error;
    }
}

async function logout(refreshToken) {
    try{
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
        await sessionQueries.revokeSession(decoded.sessionId);
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = {
    register,
    login,
    getme,
    refreshToken,
    logout
};