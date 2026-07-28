import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "20s", target: 20 },
    { duration: "30s", target: 50 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const base = __ENV.BASE_URL || "http://127.0.0.1:3000";
  const response = http.get(`${base}/api/health`);
  check(response, { "health is 200": (result) => result.status === 200 });
  sleep(1);
}
