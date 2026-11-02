const db = require("../config/db");

function createHttpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function withTransaction(callback) {
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Failed to roll back group transaction:", rollbackError);
        }
        throw error;
    } finally {
        client.release();
    }
}

async function requireGroupMember(queryable, groupId, userId) {
    const result = await queryable.query(
        `SELECT 1 FROM group_members
         WHERE group_id = $1::uuid AND user_id = $2::uuid`,
        [groupId, userId]
    );
    if (result.rowCount === 0) {
        throw createHttpError("Group not found or user is not a member.", 404);
    }
}

async function getGroupOverview(userId, groupId) {
    await requireGroupMember(db, groupId, userId);

    const groupResult = await db.query(
        `SELECT id, name, description, created_by, created_at
         FROM groups WHERE id = $1::uuid`,
        [groupId]
    );
    if (groupResult.rowCount === 0) {
        throw createHttpError("Group not found.", 404);
    }

    const membersResult = await db.query(
        `SELECT u.id, u.name, u.username, gm.joined_at
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1::uuid
         ORDER BY gm.joined_at, u.name`,
        [groupId]
    );

    const balanceResult = await db.query(
        `WITH paid_totals AS (
             SELECT group_id, paid_by AS user_id, SUM(amount) AS total
             FROM expenses
             WHERE group_id = $1::uuid
             GROUP BY group_id, paid_by
         ),
         split_totals AS (
             SELECT e.group_id, s.user_id, SUM(s.amount) AS total
             FROM expenses e
             JOIN expense_splits s ON s.expense_id = e.id
             WHERE e.group_id = $1::uuid
             GROUP BY e.group_id, s.user_id
         ),
         settlement_balances AS (
             SELECT group_id, user_id, SUM(amount) AS total
             FROM (
                 SELECT group_id, paid_by AS user_id, amount
                 FROM settlements
                 WHERE group_id = $1::uuid AND status = 'accepted'
                 UNION ALL
                 SELECT group_id, paid_to AS user_id, -amount
                 FROM settlements
                 WHERE group_id = $1::uuid AND status = 'accepted'
             ) settlement_entries
             GROUP BY group_id, user_id
         ),
         member_balances AS (
             SELECT
                 gm.user_id,
                 COALESCE(pt.total, 0) - COALESCE(st.total, 0) AS expense_balance
             FROM group_members gm
             LEFT JOIN paid_totals pt
                    ON pt.group_id = gm.group_id AND pt.user_id = gm.user_id
             LEFT JOIN split_totals st
                    ON st.group_id = gm.group_id AND st.user_id = gm.user_id
             WHERE gm.group_id = $1::uuid
         )
         SELECT expense_balance + COALESCE(sb.total, 0) AS net_balance
         FROM member_balances mb
         LEFT JOIN settlement_balances sb USING (user_id)
         WHERE mb.user_id = $2::uuid`,
        [groupId, userId]
    );

    const expenses = await listGroupExpenses(userId, groupId);

    return {
        ...groupResult.rows[0],
        members: membersResult.rows,
        net_balance: balanceResult.rows[0]?.net_balance ?? "0",
        expenses
    };
}

async function listGroupExpenses(userId, groupId) {
    await requireGroupMember(db, groupId, userId);
    const result = await db.query(
        `SELECT
             e.id,
             e.group_id,
             e.paid_by,
             payer.name AS paid_by_name,
             e.amount::text AS amount,
             e.description,
             e.created_at,
             e.updated_at,
             COALESCE((
                 SELECT json_agg(json_build_object(
                     'user_id', s.user_id,
                     'name', u.name,
                     'amount', s.amount::text
                 ) ORDER BY u.name)
                 FROM expense_splits s
                 JOIN users u ON u.id = s.user_id
                 WHERE s.expense_id = e.id
             ), '[]'::json) AS splits,
             COALESCE((
                 SELECT json_agg(json_build_object(
                     'id', st.id,
                     'paid_by', st.paid_by,
                     'paid_by_name', payer2.name,
                     'paid_to', st.paid_to,
                     'paid_to_name', recipient.name,
                     'amount', st.amount::text,
                     'status', st.status,
                     'created_at', st.created_at
                 ) ORDER BY st.created_at)
                 FROM settlements st
                 JOIN users payer2 ON payer2.id = st.paid_by
                 JOIN users recipient ON recipient.id = st.paid_to
                 WHERE st.expense_id = e.id AND st.group_id = $1::uuid
             ), '[]'::json) AS settlements
         FROM expenses e
         JOIN users payer ON payer.id = e.paid_by
         WHERE e.group_id = $1::uuid
         ORDER BY e.created_at DESC`,
        [groupId]
    );
    return result.rows;
}

async function createGroupExpense(userId, groupId, expense) {
    return withTransaction(async client => {
        await requireGroupMember(client, groupId, userId);
        const memberResult = await client.query(
            `SELECT user_id FROM group_members WHERE group_id = $1::uuid`,
            [groupId]
        );
        const memberIds = new Set(memberResult.rows.map(row => row.user_id));
        let splits;

        if (expense.split.type === "equal") {
            const participantIds = [...new Set(expense.split.userIds)];
            if (participantIds.length !== expense.split.userIds.length) {
                throw createHttpError("Split participants must be unique.", 400);
            }
            splits = makeEqualSplits(expense.amount, participantIds);
        } else if (expense.split.type === "amount") {
            splits = expense.split.shares.map(share => ({
                userId: share.userId,
                amount: share.amount
            }));
        } else {
            const totalPercentage = expense.split.shares.reduce(
                (sum, share) => sum + share.percentage,
                0
            );
            if (Math.abs(totalPercentage - 100) > 0.000001) {
                throw createHttpError("Percentage shares must add up to 100.", 400);
            }
            splits = distributePercentage(expense.amount, expense.split.shares);
        }

        validateExpenseSplits(expense.amount, splits, memberIds);

        const expenseResult = await client.query(
            `INSERT INTO expenses (group_id, paid_by, amount, description)
             VALUES ($1::uuid, $2::uuid, $3, $4)
             RETURNING id, group_id, paid_by, amount::text AS amount,
                       description, created_at, updated_at`,
            [groupId, userId, expense.amount, expense.description]
        );
        const createdExpense = expenseResult.rows[0];
        const placeholders = splits.map((_, index) =>
            `($1::uuid, $${index * 2 + 2}::uuid, $${index * 2 + 3})`
        );
        const values = [createdExpense.id];
        for (const split of splits) {
            values.push(split.userId, split.amount);
        }
        await client.query(
            `INSERT INTO expense_splits (expense_id, user_id, amount)
             VALUES ${placeholders.join(", ")}`,
            values
        );

        return {
            ...createdExpense,
            splits: splits.map(split => ({
                user_id: split.userId,
                amount: String(split.amount)
            }))
        };
    });
}

function makeEqualSplits(total, userIds) {
    const base = Math.floor(total / userIds.length);
    let remainder = total - base * userIds.length;
    return userIds.map(userId => ({
        userId,
        amount: base + (remainder-- > 0 ? 1 : 0)
    }));
}

function distributePercentage(total, shares) {
    const rounded = shares.map((share, index) => {
        const exact = total * share.percentage / 100;
        const amount = Math.floor(exact);
        return { userId: share.userId, amount, remainder: exact - amount, index };
    });
    let centsLeft = total - rounded.reduce((sum, share) => sum + share.amount, 0);
    const order = [...rounded].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let index = 0; index < centsLeft; index += 1) {
        order[index].amount += 1;
    }
    return rounded.map(({ userId, amount }) => ({ userId, amount }));
}

function validateExpenseSplits(total, splits, memberIds) {
    const userIds = splits.map(split => split.userId);
    if (new Set(userIds).size !== userIds.length) {
        throw createHttpError("Each group member can only appear once in the split.", 400);
    }
    if (splits.some(split => !memberIds.has(split.userId))) {
        throw createHttpError("Every expense participant must be a group member.", 400);
    }
    if (splits.reduce((sum, split) => sum + split.amount, 0) !== total) {
        throw createHttpError("Split amounts must add up to the expense total.", 400);
    }
}

async function getGroupExpense(client, groupId, expenseId) {
    const result = await client.query(
        `SELECT id, group_id, paid_by
         FROM expenses
         WHERE id = $1::uuid AND group_id = $2::uuid
         FOR UPDATE`,
        [expenseId, groupId]
    );
    if (result.rowCount === 0) {
        throw createHttpError("Group expense not found.", 404);
    }
    return result.rows[0];
}

async function outstandingShare(client, groupId, expenseId, debtorId, creditorId) {
    const result = await client.query(
        `SELECT
             s.amount::text AS share,
             COALESCE((
                 SELECT SUM(st.amount)
                 FROM settlements st
                 WHERE st.group_id = $1::uuid
                   AND st.expense_id = $2::uuid
                   AND st.paid_by = $3::uuid
                   AND st.paid_to = $4::uuid
                   AND st.status = 'accepted'
             ), 0)::text AS settled,
             COALESCE((
                 SELECT SUM(st.amount)
                 FROM settlements st
                 WHERE st.group_id = $1::uuid
                   AND st.expense_id = $2::uuid
                   AND st.paid_by = $3::uuid
                   AND st.paid_to = $4::uuid
                   AND st.status = 'requested'
             ), 0)::text AS requested
         FROM expense_splits s
         WHERE s.expense_id = $2::uuid AND s.user_id = $3::uuid`,
        [groupId, expenseId, debtorId, creditorId]
    );
    if (result.rowCount === 0) {
        throw createHttpError("Expense split not found for this member.", 404);
    }
    return {
        share: BigInt(result.rows[0].share),
        settled: BigInt(result.rows[0].settled),
        requested: BigInt(result.rows[0].requested)
    };
}

async function createExpenseSettlement(userId, groupId, expenseId, debtorId, amount) {
    return withTransaction(async client => {
        await requireGroupMember(client, groupId, userId);
        await requireGroupMember(client, groupId, debtorId);
        const expense = await getGroupExpense(client, groupId, expenseId);
        if (expense.paid_by !== userId || debtorId === userId) {
            throw createHttpError("Only the expense payer can record a member's payment.", 403);
        }

        const outstanding = await outstandingShare(client, groupId, expenseId, debtorId, userId);
        if (BigInt(amount) > outstanding.share - outstanding.settled - outstanding.requested) {
            throw createHttpError("Settlement exceeds the remaining amount available to settle.", 400);
        }

        const result = await client.query(
            `INSERT INTO settlements (group_id, expense_id, paid_by, paid_to, amount, status)
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, 'accepted')
             RETURNING id, group_id, expense_id, paid_by, paid_to, amount::text AS amount,
                       status, created_at`,
            [groupId, expenseId, debtorId, userId, amount]
        );
        return result.rows[0];
    });
}

async function requestExpenseSettlement(userId, groupId, expenseId, creditorId, amount) {
    return withTransaction(async client => {
        await requireGroupMember(client, groupId, userId);
        await requireGroupMember(client, groupId, creditorId);
        const expense = await getGroupExpense(client, groupId, expenseId);
        if (expense.paid_by !== creditorId || creditorId === userId) {
            throw createHttpError("Settlement requests must be sent to the expense payer.", 403);
        }

        const outstanding = await outstandingShare(client, groupId, expenseId, userId, creditorId);
        if (BigInt(amount) > outstanding.share - outstanding.settled - outstanding.requested) {
            throw createHttpError("Settlement request exceeds the remaining amount owed.", 400);
        }

        const result = await client.query(
            `INSERT INTO settlements (group_id, expense_id, paid_by, paid_to, amount, status)
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, 'requested')
             RETURNING id, group_id, expense_id, paid_by, paid_to, amount::text AS amount,
                       status, created_at`,
            [groupId, expenseId, userId, creditorId, amount]
        );
        return result.rows[0];
    });
}

async function listGroupSettlementRequests(userId, direction, status) {
    const partyColumn = direction === "incoming" ? "st.paid_to" : "st.paid_by";
    const result = await db.query(
        `SELECT
             st.id,
             st.group_id,
             g.name AS group_name,
             st.expense_id,
             e.description AS expense_description,
             st.paid_by,
             payer.name AS payer_name,
             st.paid_to,
             recipient.name AS recipient_name,
             st.amount::text AS amount,
             st.status,
             st.created_at
         FROM settlements st
         JOIN groups g ON g.id = st.group_id
         JOIN expenses e ON e.id = st.expense_id AND e.group_id = st.group_id
         JOIN users payer ON payer.id = st.paid_by
         JOIN users recipient ON recipient.id = st.paid_to
         WHERE ${partyColumn} = $1::uuid
           AND st.group_id IS NOT NULL
           AND st.status = $2
         ORDER BY st.created_at DESC`,
        [userId, status]
    );
    return result.rows;
}

async function acceptGroupSettlementRequest(userId, requestId) {
    return withTransaction(async client => {
        const requestResult = await client.query(
            `SELECT id, group_id, expense_id, paid_by, paid_to, amount
             FROM settlements
             WHERE id = $1::uuid
               AND paid_to = $2::uuid
               AND group_id IS NOT NULL
               AND status = 'requested'
             FOR UPDATE`,
            [requestId, userId]
        );
        if (requestResult.rowCount === 0) {
            throw createHttpError("Pending group settlement request not found.", 404);
        }
        const request = requestResult.rows[0];
        await requireGroupMember(client, request.group_id, userId);
        await requireGroupMember(client, request.group_id, request.paid_by);
        const expense = await getGroupExpense(client, request.group_id, request.expense_id);
        if (expense.paid_by !== userId) {
            throw createHttpError("Settlement request does not match the expense payer.", 409);
        }

        const outstanding = await outstandingShare(
            client,
            request.group_id,
            request.expense_id,
            request.paid_by,
            userId
        );
        if (BigInt(request.amount) > outstanding.share - outstanding.settled) {
            throw createHttpError("Settlement request exceeds the remaining amount owed.", 409);
        }

        const result = await client.query(
            `UPDATE settlements
             SET status = 'accepted'
             WHERE id = $1::uuid AND paid_to = $2::uuid AND status = 'requested'
             RETURNING id, group_id, expense_id, paid_by, paid_to, amount::text AS amount,
                       status, created_at`,
            [requestId, userId]
        );
        return result.rows[0];
    });
}

async function cancelGroupSettlementRequest(userId, requestId) {
    const result = await db.query(
        `DELETE FROM settlements
         WHERE id = $1::uuid
           AND paid_by = $2::uuid
           AND group_id IS NOT NULL
           AND status = 'requested'
         RETURNING id`,
        [requestId, userId]
    );
    if (result.rowCount === 0) {
        throw createHttpError("Pending group settlement request not found.", 404);
    }
    return { id: result.rows[0].id, status: "cancelled" };
}

module.exports = {
    getGroupOverview,
    listGroupExpenses,
    createGroupExpense,
    createExpenseSettlement,
    requestExpenseSettlement,
    listGroupSettlementRequests,
    acceptGroupSettlementRequest,
    cancelGroupSettlementRequest,
    makeEqualSplits,
    distributePercentage
};
