const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', "malki@alliance.com");
  await page.fill('input[type="password"], input[name="password"]', "Malki&Aman12!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(?!login)/, { timeout: 15000 }).catch(() => {});

  await page.goto("http://localhost:3000/surveys/upload", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // let the dqa-status query resolve

  await page.screenshot({ path: "generate-errors-before.png", fullPage: true });

  const unavailableNotice = await page.locator("text=Not available on this deployment").count();
  const generateButton = page.locator('button:has-text("Generate error log")');
  const selectButton = page.locator('button:has-text("Select a survey type")');
  const buttonCount = (await generateButton.count()) + (await selectButton.count());

  console.log("RESULT unavailableNotice=", unavailableNotice, "generateButtonPresent=", buttonCount > 0);

  if (buttonCount > 0) {
    const btn = (await generateButton.count()) > 0 ? generateButton : selectButton;
    await btn.first().click();
    // Wait for either success or error message, up to 3 minutes (full DQA run)
    await Promise.race([
      page.waitForSelector("text=Error report regenerated", { timeout: 180000 }),
      page.waitForSelector("text=Failed to generate error log", { timeout: 180000 }),
      page.waitForSelector('[class*="text-red-600"]', { timeout: 180000 }),
    ]).catch((e) => console.log("wait error:", e.message));
    await page.screenshot({ path: "generate-errors-after.png", fullPage: true });
    const bodyText = await page.locator("body").innerText();
    console.log("RESULT bodyExcerpt=", bodyText.slice(bodyText.indexOf("Generate error log"), bodyText.indexOf("Generate error log") + 600));
  }

  console.log("CONSOLE_ERRORS", JSON.stringify(errors.slice(0, 20)));
  await browser.close();
})().catch((e) => {
  console.error("SCRIPT_FAILED", e);
  process.exit(1);
});
