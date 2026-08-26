import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: 10,
    duration: "30s",

    thresholds: {
        http_req_failed: ["rate<0.01"],
    },
};

export default function () {

    const response = http.get(
        "http://localhost:5000/api/tasks"
    );

    check(response, {
        "status is 200": (r) => r.status === 200,
    });

    sleep(1);
}
