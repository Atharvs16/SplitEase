const db = require('../config/db');

async function createSession(user_id, refresh_token_hash, ip, user_agent, queryable = db) {
    try{
        const query = `
            INSERT INTO sessions (user_id, refresh_token_hash, ip, user_agent)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [user_id, refresh_token_hash, ip, user_agent];

    
        const result = await queryable.query(query, values);
        return result.rows[0];
    }
    catch (error) {
        console.error("Error creating session:", error);
        throw error;
    }
}

async function getSessionById(sessionId, userId) {
    try{
        const query = `
            SELECT * FROM sessions
            WHERE id = $1 AND user_id = $2
        `;
        const values = [sessionId, userId];

        const result = await db.query(query, values);
        return result.rows[0];
    }
    catch (error) {
        console.error("Error fetching session:", error);
        throw error;
    }
}

async function updateSessionRefreshToken(sessionId, newRefreshTokenHash, queryable = db) {
    try{
        const query = `
            UPDATE sessions
            SET refresh_token_hash = $1
            WHERE id = $2
            RETURNING *;
        `;
        const values = [newRefreshTokenHash, sessionId];

        const result = await queryable.query(query, values);
        return result.rows[0];
    }
    catch (error) {
        console.error("Error updating session refresh token:", error);
        throw error;
    }
}

async function rotateSessionRefreshToken(sessionId, currentRefreshTokenHash, nextRefreshTokenHash) {
    const result = await db.query(
        `UPDATE sessions
         SET refresh_token_hash = $3, updated_at = NOW()
         WHERE id = $1
           AND refresh_token_hash = $2
           AND revoked = FALSE
         RETURNING id`,
        [sessionId, currentRefreshTokenHash, nextRefreshTokenHash]
    );
    return result.rowCount === 1;
}

async function revokeSession(sessionId) {
    try{
        const query = `
            UPDATE sessions
            SET revoked = true
            WHERE id = $1
            RETURNING *;
        `;
        const values = [sessionId];

        const result = await db.query(query, values);
        return result.rows[0];
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}



module.exports = {
    createSession,
    getSessionById,
    updateSessionRefreshToken,
    rotateSessionRefreshToken,
    revokeSession
};