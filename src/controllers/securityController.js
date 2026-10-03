const pool = require("../config/database");


async function getSecurityEvents(req, res) {

    try {

        const result = await pool.query(`
            SELECT
                id,
                event_type,
                message,
                user_id,
                ip_address,
                user_agent,
                method,
                path,
                created_at
            FROM security_events
            ORDER BY created_at DESC
            LIMIT 100
        `);

        return res.json({
            success: true,
            events: result.rows
        });

    } catch (error) {

        console.error(
            "GET SECURITY EVENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors du chargement des événements de sécurité."
        });
    }
}


module.exports = {
    getSecurityEvents
};