/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { performance } = require("node:perf_hooks");
const { chromium } = require("playwright");

const baseURL = process.env.PERF_BASE_URL || "http://127.0.0.1:3001";

async function main() {
  assert.match(baseURL, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  const browser = await chromium.launch({ headless: true, channel: process.env.PERF_BROWSER || "chrome" });
  try {
    const context = await browser.newContext({ baseURL });
    const users = JSON.parse(fs.readFileSync("data/credentials.json", "utf8")).users;
    const user = users.find((candidate) => candidate.role === "malki");
    assert.ok(user, "A local dashboard administrator is needed for the load check");
    const login = await context.request.post("/api/login", {
      data: { email: user.email, password: user.password },
    });
    assert.equal(login.status(), 200, "Local login succeeds");

    const page = await context.newPage();
    const errors = [];
    const apiRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (request.url().includes("/api/")) apiRequests.push(new URL(request.url()).pathname);
    });
    await page.addInitScript(() => {
      window.loadLongTasks = [];
      new PerformanceObserver((list) => {
        for (const task of list.getEntries()) window.loadLongTasks.push(task.duration);
      }).observe({ type: "longtask", buffered: true });
    });

    const started = performance.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Recent Submissions", exact: true }).waitFor({ timeout: 60000 });
    await page.locator("tbody tr").first().waitFor();
    const dashboardReadyMs = Math.round(performance.now() - started);
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(5000);
    const initial = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const scripts = resources.filter((resource) => resource.initiatorType === "script");
      return {
        ttfbMs: Math.round(navigation.responseStart),
        scriptRequests: scripts.length,
        scriptBytes: scripts.reduce((sum, script) => sum + script.encodedBodySize, 0),
        apiBytes: resources.filter((resource) => resource.name.includes("/api/")).reduce((sum, resource) => sum + resource.encodedBodySize, 0),
        longTasks: window.loadLongTasks.length,
        blockingMs: Math.round(window.loadLongTasks.reduce((sum, duration) => sum + duration - 50, 0)),
      };
    });
    const initialApiRequests = [...new Set(apiRequests)];

    const api = {};
    const cookieHeader = (await context.cookies()).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    for (const endpoint of ["/api/metrics", "/api/tracking", "/api/hh-girls"]) {
      const start = performance.now();
      const response = await context.request.get(endpoint, { headers: { Cookie: cookieHeader } });
      assert.equal(response.status(), 200, `${endpoint} succeeds`);
      const body = await response.body();
      api[endpoint] = { durationMs: Math.round(performance.now() - start), jsonBytes: body.length };
    }

    await page.getByRole("button", { name: "Expand row" }).first().click();
    await page.getByText("Record Key:", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByText("Page 2 of", { exact: false }).waitFor();
    const visits = {};
    const renderedHeadings = {};
    const slowResources = {};
    let exportedRows = 0;
    const routes = process.argv.includes("--initial-only") ? [] : ["/tracking", "/surveys/hh-girls", "/monitoring", "/analytics", "/reports", "/surveys/errors", "/"];
    for (const href of routes) {
      const start = performance.now();
      const resourceStart = await page.evaluate(() => performance.now());
      await page.locator(`aside a[href="${href}"]`).click();
      await page.waitForURL((url) => url.pathname === href);
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      assert.equal(await page.getByText(/Failed to load/).count(), 0);
      visits[href] = Math.round(performance.now() - start);
      slowResources[href] = await page.evaluate((since) => performance.getEntriesByType("resource")
        .filter((resource) => resource.startTime >= since && resource.duration > 1000)
        .map((resource) => ({ path: new URL(resource.name).pathname, durationMs: Math.round(resource.duration) })), resourceStart);
      renderedHeadings[href] = await page.locator("#main-content h1").allTextContents();
      assert.equal(renderedHeadings[href].length, 1, "Only the active page is mounted");
      if (href === "/monitoring") {
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download report", exact: true }).click();
        const download = await downloadPromise;
        assert.match(download.suggestedFilename(), /\.xlsx$/);
        const XLSX = require("xlsx");
        const workbook = XLSX.read(await fs.promises.readFile(await download.path()), { type: "buffer" });
        exportedRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]).length;
        assert.ok(exportedRows > 0, "The lazy-loaded Excel export contains records");
      }
    }
    if (routes.length > 0) {
      await page.goBack();
      await page.waitForURL((url) => url.pathname === "/surveys/errors");
      await page.getByRole("heading", { level: 1, name: "Error Report Quality", exact: true }).waitFor();
      await page.goForward();
      await page.waitForURL((url) => url.pathname === "/");
      await page.getByRole("heading", { name: "Recent Submissions", exact: true }).waitFor();
    }
    assert.equal(errors.length, 0, `Browser errors: ${errors.join("; ")}`);
    console.log(JSON.stringify({ dashboardReadyMs, initial, initialApiRequests, api, navigationMs: visits, slowResources, renderedHeadings, exportedRows, browserErrors: errors }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
