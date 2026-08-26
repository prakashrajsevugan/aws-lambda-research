import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

// ==========================================
// Custom metrics
// ==========================================

const getTasksDuration = new Trend("get_tasks_duration");
const createTaskDuration = new Trend("create_task_duration");
const updateTaskDuration = new Trend("update_task_duration");
const deleteTaskDuration = new Trend("delete_task_duration");

const crudErrors = new Counter("crud_errors");

// ==========================================
// Test configuration
// ==========================================

export const options = {
    vus: __ENV.VUS ? Number(__ENV.VUS) : 10,
    duration: __ENV.DURATION || "30s",

    thresholds: {
        http_req_failed: ["rate<0.01"],

        get_tasks_duration: ["p(95)<500"],
        create_task_duration: ["p(95)<500"],
        update_task_duration: ["p(95)<500"],
        delete_task_duration: ["p(95)<500"],
    },
};

// ==========================================
// API configuration
// ==========================================

const BASE_URL =
    __ENV.BASE_URL || "http://localhost:5000";

const TASKS_URL = `${BASE_URL}/api/tasks`;

// ==========================================
// Main test
// ==========================================

export default function () {

    // --------------------------------------
    // 1. GET - Read existing tasks
    // --------------------------------------

    const getResponse = http.get(TASKS_URL);

    getTasksDuration.add(getResponse.timings.duration);

    const getOK = check(getResponse, {
        "GET status is 200": (r) => r.status === 200,
        "GET returned JSON": (r) =>
            r.headers["Content-Type"]?.includes("application/json"),
    });

    if (!getOK) {
        crudErrors.add(1);
    }

    // --------------------------------------
    // 2. POST - Create a new task
    // --------------------------------------

    const uniqueId =
        `${__VU}-${__ITER}-${Date.now()}`;

    const createPayload = JSON.stringify({
        title: `k6 Test Task ${uniqueId}`,
        description: `Performance test ${uniqueId}`,
        completed: false,
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
        },
    };

    const createResponse = http.post(
        TASKS_URL,
        createPayload,
        params
    );

    createTaskDuration.add(
        createResponse.timings.duration
    );

    const createOK = check(createResponse, {
        "POST status is successful": (r) =>
            r.status >= 200 && r.status < 300,
        "POST returned JSON": (r) =>
            r.headers["Content-Type"]?.includes("application/json"),
    });

    if (!createOK) {
        crudErrors.add(1);

        // Don't continue if creation failed.
        sleep(1);
        return;
    }

    // --------------------------------------
    // Extract created task ID
    // --------------------------------------

    let taskId;

    try {
        const body = createResponse.json();

        /*
         * Supports common response formats:
         *
         * { "id": 123 }
         *
         * OR
         *
         * { "task": { "id": 123 } }
         */

        taskId = body.id || body.task?.id;

    } catch (error) {
        console.error(
            `Could not parse POST response: ${error}`
        );

        crudErrors.add(1);
        sleep(1);
        return;
    }

    if (!taskId) {
        console.error(
            `POST did not return task ID: ${createResponse.body}`
        );

        crudErrors.add(1);
        sleep(1);
        return;
    }

    // --------------------------------------
    // 3. PUT - Update the task we just created
    // --------------------------------------

    const updatePayload = JSON.stringify({
        title: `Updated k6 Task ${uniqueId}`,
        description: `Updated performance test ${uniqueId}`,
        completed: true,
    });

    const updateResponse = http.put(
        `${TASKS_URL}/${taskId}`,
        updatePayload,
        params
    );

    updateTaskDuration.add(
        updateResponse.timings.duration
    );

    const updateOK = check(updateResponse, {
        "PUT status is successful": (r) =>
            r.status >= 200 && r.status < 300,
    });

    if (!updateOK) {
        crudErrors.add(1);
    }

    // --------------------------------------
    // 4. DELETE - Delete the task we created
    // --------------------------------------

    const deleteResponse = http.del(
        `${TASKS_URL}/${taskId}`
    );

    deleteTaskDuration.add(
        deleteResponse.timings.duration
    );

    const deleteOK = check(deleteResponse, {
        "DELETE status is successful": (r) =>
            r.status >= 200 && r.status < 300,
    });

    if (!deleteOK) {
        crudErrors.add(1);
    }

    // --------------------------------------
    // Small pause before next iteration
    // --------------------------------------

    sleep(1);
}
