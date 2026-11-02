const assert = require("node:assert/strict");
const test = require("node:test");
const { validateRegister } = require("../validators/auth.validator");
const { validateCreateGroup } = require("../validators/groups.validator");
const {
    validateCreateExpense,
    validateUuidParams
} = require("../validators/group-expenses.validator");

function invoke(validator, req) {
    const result = { statusCode: null, body: null, nextCalled: false };
    const res = {
        status(statusCode) {
            result.statusCode = statusCode;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        }
    };

    validator(req, res, () => {
        result.nextCalled = true;
    });

    return result;
}

test("registration trims names and rejects invalid credentials", () => {
    const validRequest = {
        body: {
            name: "  Alex Doe ",
            username: "alex_doe",
            phone: "9876543210",
            password: "password1"
        }
    };
    const valid = invoke(validateRegister, validRequest);
    assert.equal(valid.nextCalled, true);
    assert.equal(valid.statusCode, null);
    assert.equal(valid.body, null);
    assert.equal(validRequest.body.name, "Alex Doe");

    const invalid = invoke(validateRegister, {
        body: {
            name: "A",
            username: "bad name",
            phone: "123",
            password: "short"
        }
    });
    assert.equal(invalid.nextCalled, false);
    assert.equal(invalid.statusCode, 400);
    assert.ok(invalid.body.details.length > 0);

    const oversizedPassword = invoke(validateRegister, {
        body: {
            name: "Alex Doe",
            username: "alex_doe",
            phone: "9876543210",
            password: "😀".repeat(19)
        }
    });
    assert.equal(oversizedPassword.statusCode, 400);
    assert.ok(oversizedPassword.body.details.some(issue => issue.field === "password"));
});

test("group validation requires a valid name and unique member IDs", () => {
    const duplicateId = "9ac6ef9e-258f-4de0-835c-24969c44d845";
    const result = invoke(validateCreateGroup, {
        body: {
            name: "Trip",
            description: "",
            memberIds: [duplicateId, duplicateId]
        }
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 400);
    assert.ok(result.body.details.some((issue) => issue.message.includes("once")));
});

test("expense validation rejects splits with invalid participant IDs", () => {
    const result = invoke(validateCreateExpense, {
        body: {
            description: "Dinner",
            amount: 1200,
            split: {
                type: "equal",
                userIds: ["not-a-uuid"]
            }
        }
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 400);
});

test("route validation rejects malformed group IDs", () => {
    const result = invoke(validateUuidParams("groupId"), {
        params: { groupId: "invalid" }
    });

    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 400);
});
