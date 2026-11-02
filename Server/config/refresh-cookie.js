const isProduction = process.env.NODE_ENV === "production";

const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
};

module.exports = { refreshCookieOptions };
