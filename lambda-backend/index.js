const { Pool } = require("pg");

let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 5432),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,

            ssl: {
                rejectUnauthorized: false
            },

            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }

    return pool;
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods":
                "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: JSON.stringify(body),
    };
}

exports.handler = async (event) => {

    console.log("Event:", JSON.stringify(event));

    const method =
        event.requestContext?.http?.method ||
        event.httpMethod;

    const path =
        event.rawPath ||
        event.path ||
        "/";

    console.log("Method:", method);
    console.log("Path:", path);

    // CORS
    if (method === "OPTIONS") {
        return response(200, {
            message: "CORS OK"
        });
    }

    try {

        const db = getPool();

        // ==========================
        // GET /api/tasks
        // ==========================

        if (
            method === "GET" &&
            path === "/api/tasks"
        ) {

            const result = await db.query(`
                SELECT *
                FROM tasks
                ORDER BY id DESC
            `);

            return response(200, result.rows);
        }

        // ==========================
        // POST /api/tasks
        // ==========================

        if (
            method === "POST" &&
            path === "/api/tasks"
        ) {

            const body = JSON.parse(
                event.body || "{}"
            );

            const {
                title,
                description,
                completed = false
            } = body;

            if (!title) {
                return response(400, {
                    error: "Title is required"
                });
            }

            const result = await db.query(
                `
                INSERT INTO tasks
                (title, description, completed)
                VALUES ($1, $2, $3)
                RETURNING *
                `,
                [
                    title,
                    description || "",
                    completed
                ]
            );

            return response(
                201,
                result.rows[0]
            );
        }

        // ==========================
        // PUT /api/tasks/{id}
        // ==========================

        if (
            method === "PUT" &&
            path.startsWith("/api/tasks/")
        ) {

            const id = path.split("/").pop();

            const body = JSON.parse(
                event.body || "{}"
            );

            const {
                title,
                description,
                completed
            } = body;

            const result = await db.query(
                `
                UPDATE tasks
                SET
                    title = $1,
                    description = $2,
                    completed = $3
                WHERE id = $4
                RETURNING *
                `,
                [
                    title,
                    description || "",
                    completed,
                    id
                ]
            );

            if (result.rows.length === 0) {
                return response(404, {
                    error: "Task not found"
                });
            }

            return response(
                200,
                result.rows[0]
            );
        }

        // ==========================
        // DELETE /api/tasks/{id}
        // ==========================

        if (
            method === "DELETE" &&
            path.startsWith("/api/tasks/")
        ) {

            const id = path.split("/").pop();

            const result = await db.query(
                `
                DELETE FROM tasks
                WHERE id = $1
                RETURNING *
                `,
                [id]
            );

            if (result.rows.length === 0) {
                return response(404, {
                    error: "Task not found"
                });
            }

            return response(200, {
                message: "Task deleted successfully",
                task: result.rows[0]
            });
        }

        return response(404, {
            error: "Route not found",
            method,
            path
        });

    }  catch (error) {
        console.error("DATABASE ERROR:", error);
    
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};
