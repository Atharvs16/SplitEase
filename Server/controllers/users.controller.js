const usersService = require("../services/users.service");
const { refreshCookieOptions } = require("../config/refresh-cookie");

function accessToken(req) {
    return req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null;
}

function respondWithError(res, error, genericMessage) {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: genericMessage });
}

async function getProfile(req, res) {
    try {
        const result = await usersService.getProfile(accessToken(req), req.params.username);
        return res.status(200).json(result);
    } catch (error) {
        return respondWithError(res, error, "Unable to load profile.");
    }
}

async function updateProfile(req, res) {
    const { name, phone, currentPassword, newPassword } = req.body;
    if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 50 ||
        typeof phone !== "string" ||
        !/^[6-9]\d{9}$/.test(phone.trim()) ||
        (newPassword !== undefined &&
            (typeof newPassword !== "string" ||
                newPassword.length < 8 ||
                newPassword.length > 72 ||
                Buffer.byteLength(newPassword, "utf8") > 72)) ||
        (currentPassword !== undefined && typeof currentPassword !== "string")
    ) {
        return res.status(400).json({ error: "Enter a valid name, Indian phone number, and password." });
    }

    try {
        const user = await usersService.updateProfile(accessToken(req), {
            name: name.trim(),
            phone: phone.trim(),
            currentPassword,
            newPassword
        });
        return res.status(200).json({ user });
    } catch (error) {
        return respondWithError(res, error, "Unable to update profile.");
    }
}

async function deleteAccount(req, res) {
    if (typeof req.body.currentPassword !== "string" || !req.body.currentPassword) {
        return res.status(400).json({ error: "Current password is required." });
    }

    try {
        await usersService.deleteAccount(accessToken(req), req.body.currentPassword);
        res.clearCookie("refreshtoken", refreshCookieOptions);
        return res.status(200).json({ message: "Account deleted. Shared financial history has been preserved." });
    } catch (error) {
        return respondWithError(res, error, "Unable to delete account.");
    }
}

module.exports = {
    getProfile,
    updateProfile,
    deleteAccount
};
