const express = require("express");

const router = express.Router();

const {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask,
} = require("../controllers/taskController");


// CREATE
router.post("/", createTask);

// READ ALL
router.get("/", getTasks);

// READ ONE
router.get("/:id", getTask);

// UPDATE
router.put("/:id", updateTask);

// DELETE
router.delete("/:id", deleteTask);


module.exports = router;