import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ============================================
// Configuration
// ============================================

const BASE_URL =
    __ENV.BASE_URL || __ENV.API_ENDPOINT || "http://localhost:5000";

// ============================================
// Custom Metrics
// ============================================

const getLatency = new Trend("get_latency");
const postLatency = new Trend("post_latency");
const putLatency = new Trend("put_latency");
const deleteLatency = new Trend("delete_latency");

const crudErrors = new Rate("crud_error_rate");

const createdTasks = new Counter("created_tasks");
const deletedTasks = new Counter("deleted_tasks");

// ============================================
// Test Configuration
// ============================================

export const options = {

    scenarios: {

        crud_test: {

            executor: "constant-vus",

            vus: Number(__ENV.VUS || 10),

            duration: __ENV.DURATION || "30s",

        },

    },

    thresholds: {

        http_req_failed: [
            "rate<0.01"
        ],

        get_latency: [
            "p(95)<1000"
        ],

        post_latency: [
            "p(95)<1000"
        ],

        put_latency: [
            "p(95)<1000"
        ],

        delete_latency: [
            "p(95)<1000"
        ],

        crud_error_rate: [
            "rate<0.01"
        ],
    },
};

// ============================================
// Main Test
// ============================================

export default function () {

    // ========================================
    // 1. GET
    // ========================================

    const getResponse = http.get(
        `${BASE_URL}/api/tasks`
    );

    getLatency.add(getResponse.timings.duration);

    const getOK = check(getResponse, {

        "GET status is 200":
            (r) => r.status === 200,

    });

    if (!getOK) {
        crudErrors.add(1);
    } else {
        crudErrors.add(0);
    }


    // ========================================
    // 2. POST
    // ========================================

    const uniqueTitle =
        `Lambda VU-${__VU}-Iteration-${__ITER}-${Date.now()}`;

    const postPayload = JSON.stringify({

        title: uniqueTitle,

        description:
            "k6 AWS Lambda performance test",

        completed: false,

    });

    const postResponse = http.post(

        `${BASE_URL}/api/tasks`,

        postPayload,

        {

            headers: {
                "Content-Type": "application/json",
            },

        }

    );

    postLatency.add(
        postResponse.timings.duration
    );

    const postOK = check(postResponse, {

        "POST status is 201":
            (r) => r.status === 201,

        "POST returned task ID":
            (r) => {

                try {

                    const body = r.json();

                    return body.id !== undefined;

                } catch (e) {

                    return false;

                }

            },

    });

    if (!postOK) {

        crudErrors.add(1);

        // If POST failed, don't attempt PUT/DELETE
        sleep(1);

        return;

    }

    crudErrors.add(0);

    createdTasks.add(1);


    // Get created task ID

    const createdTask =
        postResponse.json();

    const taskId =
        createdTask.id;


    // ========================================
    // 3. PUT
    // ========================================

    const putPayload = JSON.stringify({

        title:
            `${uniqueTitle} - Updated`,

        description:
            "Updated by k6 Lambda performance test",

        completed: true,

    });

    const putResponse = http.put(

        `${BASE_URL}/api/tasks/${taskId}`,

        putPayload,

        {

            headers: {
                "Content-Type": "application/json",
            },

        }

    );

    putLatency.add(
        putResponse.timings.duration
    );

    const putOK = check(putResponse, {

        "PUT status is 200":
            (r) => r.status === 200,

        "PUT completed successfully":
            (r) => {

                try {

                    const body = r.json();

                    return body.completed === true;

                } catch (e) {

                    return false;

                }

            },

    });

    if (!putOK) {
        crudErrors.add(1);
    } else {
        crudErrors.add(0);
    }


    // ========================================
    // 4. DELETE
    // ========================================

    const deleteResponse = http.del(

        `${BASE_URL}/api/tasks/${taskId}`

    );

    deleteLatency.add(
        deleteResponse.timings.duration
    );

    const deleteOK = check(deleteResponse, {

        "DELETE status is 200":
            (r) => r.status === 200,

    });

    if (!deleteOK) {
        crudErrors.add(1);
    } else {
        crudErrors.add(0);
    }

    if (deleteOK) {
        deletedTasks.add(1);
    }

    // Small pause between iterations

    sleep(1);
}
