
const { z } = require("zod");

const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be at most 50 characters"),

    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username must be at most 20 characters")
        .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores"
        ),

    phone: z
        .string()
        .trim()
        .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password must be at most 72 characters")
        .refine(
            password => Buffer.byteLength(password, "utf8") <= 72,
            "Password must be at most 72 UTF-8 bytes"
        )
});

function validateRegister(req, res, next) {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: "Validation failed",
            details: result.error.issues.map(issue => ({
                field: issue.path[0],
                message: issue.message
            }))
        });
    }

    req.body = result.data;

    next();
}

module.exports = {
    validateRegister
};
