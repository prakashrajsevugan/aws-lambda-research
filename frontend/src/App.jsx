import { useEffect, useState } from "react";
import api from "./api";
import "./App.css";

function App() {
    const [tasks, setTasks] = useState([]);

    const [form, setForm] = useState({
        title: "",
        description: "",
    });

    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);

    // ==========================
    // GET ALL TASKS
    // ==========================

    const fetchTasks = async () => {
        try {
            const response = await api.get("/tasks");

            console.log("GET:", response.data);

            setTasks(response.data);
        } catch (error) {
            console.error(
                "Failed to fetch tasks:",
                error.response?.data || error.message
            );

            alert("Failed to load tasks");
        }
    };

    // ==========================
    // CREATE / UPDATE
    // ==========================

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.title.trim()) {
            alert("Please enter a task title");
            return;
        }

        setLoading(true);

        try {
            // ==========================
            // UPDATE
            // ==========================

            if (editingId !== null) {
                const task = tasks.find(
                    (task) => task.id === editingId
                );

                if (!task) {
                    alert("Task not found");
                    return;
                }

                const response = await api.put(
                    `/tasks/${editingId}`,
                    {
                        title: form.title,
                        description: form.description,
                        completed: task.completed,
                    }
                );

                console.log("PUT:", response.data);

                alert("Task updated successfully!");

                setEditingId(null);
            }

            // ==========================
            // CREATE
            // ==========================

            else {
                const response = await api.post(
                    "/tasks",
                    {
                        title: form.title,
                        description: form.description,
                        completed: false,
                    }
                );

                console.log("POST:", response.data);

                alert("Task created successfully!");
            }

            // Clear form
            setForm({
                title: "",
                description: "",
            });

            // Get latest database data
            await fetchTasks();

        } catch (error) {
            console.error(
                "Save error:",
                error.response?.data || error.message
            );

            alert(
                error.response?.data?.error ||
                "Failed to save task"
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================
    // DELETE
    // ==========================

    const deleteTask = async (id) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this task?"
        );

        if (!confirmDelete) {
            return;
        }

        try {
            const response = await api.delete(
                `/tasks/${id}`
            );

            console.log("DELETE:", response.data);

            alert("Task deleted successfully!");

            // Refresh database data
            await fetchTasks();

        } catch (error) {
            console.error(
                "Delete error:",
                error.response?.data || error.message
            );

            alert(
                error.response?.data?.error ||
                "Failed to delete task"
            );
        }
    };

    // ==========================
    // TOGGLE COMPLETE
    // ==========================

    const toggleTask = async (task) => {
        try {
            const response = await api.put(
                `/tasks/${task.id}`,
                {
                    title: task.title,
                    description: task.description || "",
                    completed: !task.completed,
                }
            );

            console.log("TOGGLE:", response.data);

            alert(
                !task.completed
                    ? "Task marked as completed!"
                    : "Task marked as pending!"
            );

            // Refresh database data
            await fetchTasks();

        } catch (error) {
            console.error(
                "Toggle error:",
                error.response?.data || error.message
            );

            alert(
                error.response?.data?.error ||
                "Failed to update task"
            );
        }
    };

    // ==========================
    // EDIT
    // ==========================

    const editTask = (task) => {
        setEditingId(task.id);

        setForm({
            title: task.title,
            description: task.description || "",
        });
    };

    // ==========================
    // CANCEL EDIT
    // ==========================

    const cancelEdit = () => {
        setEditingId(null);

        setForm({
            title: "",
            description: "",
        });
    };

    // ==========================
    // LOAD TASKS
    // ==========================

    useEffect(() => {
        fetchTasks();
    }, []);

    // ==========================
    // UI
    // ==========================

    return (
        <div className="container">

            <h1>Task Manager</h1>

            {/* ==========================
                FORM
            ========================== */}

            <form
                onSubmit={handleSubmit}
                className="task-form"
            >

                <input
                    type="text"
                    placeholder="Task title"
                    value={form.title}
                    onChange={(event) =>
                        setForm({
                            ...form,
                            title: event.target.value,
                        })
                    }
                />

                <textarea
                    placeholder="Task description"
                    value={form.description}
                    onChange={(event) =>
                        setForm({
                            ...form,
                            description:
                                event.target.value,
                        })
                    }
                />

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "Saving..."
                        : editingId !== null
                        ? "Update Task"
                        : "Create Task"}
                </button>

                {editingId !== null && (
                    <button
                        type="button"
                        onClick={cancelEdit}
                    >
                        Cancel
                    </button>
                )}

            </form>

            {/* ==========================
                TASK LIST
            ========================== */}

            <div className="task-list">

                {tasks.length === 0 ? (
                    <p>No tasks available.</p>
                ) : (

                    tasks.map((task) => (

                        <div
                            className={`task ${
                                task.completed
                                    ? "completed"
                                    : ""
                            }`}
                            key={task.id}
                        >

                            <h2>
                                {task.title}
                            </h2>

                            <p>
                                {task.description}
                            </p>

                            <p>
                                Status:{" "}
                                <strong>
                                    {task.completed
                                        ? "Completed"
                                        : "Pending"}
                                </strong>
                            </p>

                            <div className="actions">

                                {/* COMPLETE / PENDING */}

                                <button
                                    onClick={() =>
                                        toggleTask(task)
                                    }
                                >
                                    {task.completed
                                        ? "Mark Pending"
                                        : "Complete"}
                                </button>

                                {/* EDIT */}

                                <button
                                    onClick={() =>
                                        editTask(task)
                                    }
                                >
                                    Edit
                                </button>

                                {/* DELETE */}

                                <button
                                    onClick={() =>
                                        deleteTask(task.id)
                                    }
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    ))

                )}

            </div>

        </div>
    );
}

export default App;