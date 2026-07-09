import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { config, mockPortalCredentials } from "../config.js";

export function createMockPortal(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/", async (_request, reply) => {
    return reply.type("text/html").send(loginPage());
  });

  app.post("/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string } | undefined;

    if (body?.username === mockPortalCredentials.username && body?.password === mockPortalCredentials.password) {
      return { ok: true, redirectTo: "/dashboard" };
    }

    return reply.code(401).send({ ok: false, message: "Invalid student credentials" });
  });

  app.get("/dashboard", async (_request, reply) => {
    return reply.type("text/html").send(dashboardPage());
  });

  app.get("/attendance", async (_request, reply) => {
    return reply.type("text/html").send(attendancePage());
  });

  return app;
}

export async function startMockPortal(): Promise<FastifyInstance> {
  const app = createMockPortal();
  await app.listen({ host: config.mockPortal.host, port: config.mockPortal.port });
  return app;
}

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; background: #f6f7fb; color: #172033; }
    main { max-width: 880px; margin: 56px auto; background: white; border: 1px solid #e6e8ef; border-radius: 18px; padding: 32px; box-shadow: 0 20px 60px rgba(23, 32, 51, 0.08); }
    h1 { margin-top: 0; }
    label { display: block; font-size: 14px; margin: 16px 0 6px; color: #526078; }
    input { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid #ccd2e1; border-radius: 10px; font-size: 16px; }
    button, a.button { display: inline-block; margin-top: 20px; background: #4338ca; color: white; border: 0; padding: 12px 16px; border-radius: 10px; font-size: 15px; text-decoration: none; cursor: pointer; }
    nav a { margin-right: 14px; color: #4338ca; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; border-bottom: 1px solid #e6e8ef; padding: 12px; }
    th { background: #f0f2ff; }
    .hint { color: #667085; font-size: 14px; }
    .card { padding: 18px; border: 1px solid #e6e8ef; border-radius: 14px; margin-top: 16px; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

function loginPage(): string {
  return pageShell(
    "Mock College Portal Login",
    `<h1>Student Portal</h1>
    <p class="hint">Demo login is configured locally. Set <code>MOCK_PORTAL_USERNAME</code> and <code>MOCK_PORTAL_PASSWORD</code> to override it.</p>
    <form id="login-form">
      <label for="username">Student ID</label>
      <input id="username" name="username" autocomplete="username" />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" />
      <button id="login-button" type="submit">Login</button>
    </form>
    <p id="error" role="alert" style="color:#b42318"></p>
    <script>
      document.querySelector("#login-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = document.querySelector("#username").value;
        const password = document.querySelector("#password").value;
        const response = await fetch("/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.ok) window.location.href = data.redirectTo;
        else document.querySelector("#error").textContent = data.message;
      });
    </script>`
  );
}

function dashboardPage(): string {
  return pageShell(
    "Mock College Portal Dashboard",
    `<h1>Welcome, Hardik</h1>
    <p class="hint">This is a fake but realistic dashboard for Week 1 GhostAPI.</p>
    <nav>
      <a href="/attendance" aria-label="Open Attendance">Attendance</a>
      <a href="#" aria-label="Open Marks">Marks</a>
      <a href="#" aria-label="Open Fees">Fees</a>
    </nav>
    <div class="card">
      <strong>Notice:</strong> Internal assessment marks will be updated soon.
    </div>`
  );
}

function attendancePage(): string {
  return pageShell(
    "Mock College Portal Attendance",
    `<h1>Attendance</h1>
    <p id="student-name">Student: <strong>Hardik</strong></p>
    <p id="semester">Semester: <strong>5</strong></p>
    <table id="attendance-table" aria-label="Attendance table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Attended</th>
          <th>Total</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Operating Systems</td><td>32</td><td>40</td><td>80%</td></tr>
        <tr><td>Database Management Systems</td><td>28</td><td>35</td><td>80%</td></tr>
        <tr><td>Computer Networks</td><td>30</td><td>36</td><td>83%</td></tr>
        <tr><td>Software Engineering</td><td>25</td><td>30</td><td>83%</td></tr>
      </tbody>
    </table>
    <a class="button" href="/dashboard">Back to Dashboard</a>`
  );
}
