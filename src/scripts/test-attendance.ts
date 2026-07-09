import { mockPortalCredentials } from "../config.js";

const response = await fetch("http://127.0.0.1:4000/v1/actions/get-attendance/run", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    credentials: mockPortalCredentials
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
