const pool = require("../config/database");

// ==========================================
// CREATE TASK
// POST /api/tasks
// ==========================================
const createTask = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json({
                message: "Title is required",
            });
        }

        const result = await pool.query(
            `INSERT INTO tasks (title, description)
             VALUES ($1, $2)
             RETURNING *`,
            [title.trim(), description || null]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("CREATE ERROR:", error);

        res.status(500).json({
            message: "Failed to create task",
            error: error.message,
        });
    }
};


// ==========================================
// GET ALL TASKS
// GET /api/tasks
// ==========================================
const getTasks = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM tasks
             ORDER BY created_at DESC`
        );

        res.status(200).json(result.rows);

    } catch (error) {
        console.error("GET TASKS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch tasks",
            error: error.message,
        });
    }
};


// ==========================================
// GET SINGLE TASK
// GET /api/tasks/:id
// ==========================================
const getTask = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM tasks
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error("GET TASK ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch task",
            error: error.message,
        });
    }
};


// ==========================================
// UPDATE TASK
// PUT /api/tasks/:id
// ==========================================
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            description,
            completed,
        } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json({
                message: "Title is required",
            });
        }

        const result = await pool.query(
            `UPDATE tasks
             SET
                title = $1,
                description = $2,
                completed = $3,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [
                title.trim(),
                description || null,
                Boolean(completed),
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error("UPDATE ERROR:", error);

        res.status(500).json({
            message: "Failed to update task",
            error: error.message,
        });
    }
};


// ==========================================
// DELETE TASK
// DELETE /api/tasks/:id
// ==========================================
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM tasks
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task deleted successfully",
            task: result.rows[0],
        });

    } catch (error) {
        console.error("DELETE ERROR:", error);

        res.status(500).json({
            message: "Failed to delete task",
            error: error.message,
        });
    }
};


module.exports = {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask,
};