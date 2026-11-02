const assert = require("node:assert/strict");
const test = require("node:test");

process.env.DB_USER ||= "test";
process.env.DB_PASSWORD ||= "test";
process.env.DB_NAME ||= "test";
process.env.DB_HOST ||= "localhost";
process.env.DB_PORT ||= "5432";
process.env.JWT_SECRET ||= "test-only-secret-for-auth-workflow-tests";

const bcrypt = require("bcrypt");
const authService = require("../services/auth.service");
const friendsService = require("../services/friends.services");
const userQueries = require("../queries/users.queries");
const sessionQueries = require("../queries/sessions.queries");
const friendsQueries = require("../queries/friends.queries");
const groupExpenseQueries = require("../queries/group-expenses.queries");
const friendExpenseQueries = require("../queries/friend-expenses.queries");
const db = require("../config/db");
const { loginRateLimit } = require("../middleware/auth-rate-limit");
const express = require("express");

test("legacy bcrypt refresh tokens upgrade on use and cannot be reused", async (t) => {
    const user = {
        id: "308d64d2-d999-46cf-bd6d-2dfb6281af5c",
        name: "Alex Doe",
        username: "alex_doe",
        phone: "9876543210",
        password_hash: await bcrypt.hash("safePassword123", 4)
    };
    const session = {
        id: "e6527b56-f5a8-457d-aa96-99a29dbde8cb",
        user_id: user.id,
        revoked: false
    };
    let storedRefreshHash = null;

    t.mock.method(userQueries, "getUserByUsername", async () => user);
    t.mock.method(userQueries, "getUserById", async () => user);
    t.mock.method(sessionQueries, "createSession", async () => session);
    t.mock.method(sessionQueries, "updateSessionRefreshToken", async (_id, hash) => {
        storedRefreshHash = hash;
    });
    t.mock.method(sessionQueries, "getSessionById", async () => ({
        ...session,
        refresh_token_hash: storedRefreshHash
    }));
    t.mock.method(sessionQueries, "rotateSessionRefreshToken", async (_id, currentHash, nextHash) => {
        if (currentHash !== storedRefreshHash) return false;
        storedRefreshHash = nextHash;
        return true;
    });

    const login = await authService.login({
        username: user.username,
        password: "safePassword123",
        ip: "127.0.0.1",
        userAgent: "test"
    });
    assert.equal(login.success, true);
    storedRefreshHash = await bcrypt.hash(login.refreshToken, 4);

    const refreshAttempts = await Promise.allSettled([
        authService.refreshToken(login.refreshToken),
        authService.refreshToken(login.refreshToken)
    ]);
    assert.equal(refreshAttempts.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(refreshAttempts.filter(result => result.status === "rejected").length, 1);
    const refreshed = refreshAttempts.find(result => result.status === "fulfilled").value;
    assert.notEqual(refreshed.refreshToken, login.refreshToken);
    assert.equal(storedRefreshHash.startsWith("sha256:"), true);
    assert.notEqual(storedRefreshHash, login.refreshToken);
    await assert.rejects(
        authService.refreshToken(login.refreshToken),
        error => error.name === "UnauthorizedError"
    );
});

test("friend search requires an authenticated user and scopes the query to that user", async (t) => {
    const userId = "308d64d2-d999-46cf-bd6d-2dfb6281af5c";
    t.mock.method(authService, "getme", async () => ({ id: userId }));
    const search = t.mock.method(friendsQueries, "searchByUsername", async () => []);

    await assert.rejects(
        friendsService.searchByUsername(null, "alex"),
        error => error.statusCode === 401
    );
    assert.equal(search.mock.callCount(), 0);

    await friendsService.searchByUsername("access-token", "alex");
    assert.deepEqual(search.mock.calls[0].arguments, [userId, "alex"]);
});

test("equal and percentage expense splits preserve the exact total", () => {
    const equalSplits = groupExpenseQueries.makeEqualSplits(100, ["a", "b", "c"]);
    assert.deepEqual(equalSplits.map(split => split.amount), [34, 33, 33]);

    const percentageSplits = groupExpenseQueries.distributePercentage(101, [
        { userId: "a", percentage: 33.33 },
        { userId: "b", percentage: 33.33 },
        { userId: "c", percentage: 33.34 }
    ]);
    assert.equal(percentageSplits.reduce((sum, split) => sum + split.amount, 0), 101);
});

test("settlement acceptance is restricted to pending requests within the remaining share", async (t) => {
    const payerId = "308d64d2-d999-46cf-bd6d-2dfb6281af5c";
    const debtorId = "2479aa02-c085-4fbd-83a0-2917b2c852ad";
    const requestId = "f1b1aec5-81e6-40c3-8c43-526c0a183a5f";
    const expenseId = "8d00da06-9da8-441c-97c3-43f3b6a95b90";
    const queryLog = [];
    let requestedAmount = "300";
    const client = {
        async query(query) {
            queryLog.push(query);
            if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
                return { rowCount: 0, rows: [] };
            }
            if (query.includes("FROM settlements") && query.includes("FOR UPDATE")) {
                return {
                    rowCount: 1,
                    rows: [{
                        id: requestId,
                        expense_id: expenseId,
                        paid_by: debtorId,
                        paid_to: payerId,
                        amount: requestedAmount
                    }]
                };
            }
            if (query.includes("FROM friends")) return { rowCount: 1, rows: [{}] };
            if (query.includes("FROM expenses") && query.includes("FOR UPDATE")) {
                return { rowCount: 1, rows: [{ id: expenseId, paid_by: payerId, group_id: null }] };
            }
            if (query.includes("FROM expense_splits")) {
                return { rowCount: 1, rows: [{ amount: "1000" }] };
            }
            if (query.includes("id <> $4::uuid")) {
                return { rowCount: 1, rows: [{ total: "100" }] };
            }
            if (query.includes("COALESCE(SUM(amount), 0)::text AS total")) {
                return { rowCount: 1, rows: [{ total: "200" }] };
            }
            if (query.includes("UPDATE settlements")) {
                return {
                    rowCount: 1,
                    rows: [{ id: requestId, status: "accepted", amount: "300" }]
                };
            }
            throw new Error(`Unexpected settlement test query: ${query}`);
        },
        release() {}
    };
    t.mock.method(db, "connect", async () => client);

    const accepted = await friendExpenseQueries.acceptSettlementRequest(payerId, requestId);
    assert.equal(accepted.status, "accepted");
    assert.ok(queryLog.includes("COMMIT"));
    assert.ok(!queryLog.includes("ROLLBACK"));

    requestedAmount = "800";
    queryLog.length = 0;
    await assert.rejects(
        friendExpenseQueries.acceptSettlementRequest(payerId, requestId),
        error => error.statusCode === 409
    );
    assert.ok(queryLog.includes("ROLLBACK"));
    assert.ok(!queryLog.some(query => query.includes("UPDATE settlements")));
});

test("settlement cancellation only deletes the caller's pending request", async (t) => {
    const userId = "308d64d2-d999-46cf-bd6d-2dfb6281af5c";
    const requestId = "f1b1aec5-81e6-40c3-8c43-526c0a183a5f";
    const query = t.mock.method(db, "query", async (sql, values) => {
        assert.match(sql, /paid_by = \$2::uuid/);
        assert.match(sql, /status = 'requested'/);
        assert.deepEqual(values, [requestId, userId]);
        return { rowCount: 1, rows: [{ id: requestId }] };
    });

    const result = await friendExpenseQueries.cancelSettlementRequest(userId, requestId);
    assert.deepEqual(result, { id: requestId, status: "cancelled" });
    assert.equal(query.mock.callCount(), 1);
});

test("login rate limit blocks repeated failed authentication attempts", async (t) => {
    const app = express();
    app.post("/login", loginRateLimit, (_req, res) => res.status(401).json({ error: "Invalid credentials" }));
    const server = app.listen(0);
    t.after(() => new Promise(resolve => server.close(resolve)));
    await new Promise(resolve => server.once("listening", resolve));

    const url = `http://127.0.0.1:${server.address().port}/login`;
    const statuses = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
        const response = await fetch(url, { method: "POST" });
        statuses.push(response.status);
    }

    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.equal(statuses[10], 429);
});
