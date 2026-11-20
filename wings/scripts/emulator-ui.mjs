import puppeteer from "/tmp/shot/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const base = process.env.APP_URL || "http://127.0.0.1:5173";
const email = `ui-${Date.now()}@wings.test`;
const password = "test-pass-123";
const results = [];

function record(name, pass, evidence) {
  results.push({ name, pass, evidence });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  console.log(`  ${evidence}`);
}

async function text(page) {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 500));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE", msg.text().slice(0, 240));
  });
  const queries = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("127.0.0.1:8080")) return;
    const post = request.postData() || "";
    if (/structuredQuery|StructuredQuery|aggregation|workoutLogs/i.test(post)) {
      queries.push(post.replace(/\s+/g, " ").slice(0, 160));
    }
  });

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}/#/`, { waitUntil: "networkidle0" });
  const signedOut = await text(page);
  record(
    "signed-out / is the public landing page",
    /calisthenics/i.test(signedOut) && !/HEY,/.test(signedOut),
    signedOut.slice(0, 180),
  );

  await page.goto(`${base}/#/createaccount`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#email", { timeout: 20000 });
  await page.type("#email", email);
  await page.type("#password", password);
  await Promise.all([
    page.waitForFunction(() => location.hash.includes("/dashboard"), { timeout: 20000 }),
    page.click("button.signup-form__submits[type=submit]"),
  ]);
  await page.waitForFunction(() => document.body.innerText.includes("HEY,"), { timeout: 15000 });
  const dash = await text(page);
  record("email sign-up lands on the dashboard", /HEY,/.test(dash), dash.slice(0, 180));

  await page.setViewport({ width: 390, height: 844 });
  await page.waitForSelector(".tabbar");
  const tabDisplay = await page.$eval(".tabbar", (el) => getComputedStyle(el).display);
  record("tab bar is visible at 390px", tabDisplay === "flex", tabDisplay);

  async function openTab(label, hashPart) {
    await page.evaluate((name) => {
      const link = [...document.querySelectorAll(".tabbar a")].find((node) => node.textContent.includes(name));
      link.click();
    }, label);
    await page.waitForFunction((part) => location.hash.includes(part), { timeout: 10000 }, hashPart);
  }
  await openTab("Log", "/workoutlog");
  await openTab("Skills", "/skilltree");
  await openTab("Learn", "/learn");
  await openTab("Account", "/settings");
  await openTab("Home", "/dashboard");
  record("tab bar routes Home, Log, Skills, Learn, and Account", true, await page.evaluate(() => location.hash));

  await page.setViewport({ width: 1280, height: 900 });
  const navDisplay = await page.$eval(".navbar", (el) => getComputedStyle(el).display);
  const tabHidden = await page.$eval(".tabbar", (el) => getComputedStyle(el).display);
  const navText = await page.$eval(".navbar__list", (el) => el.innerText.replace(/\s+/g, " "));
  record(
    "desktop navbar is right-aligned and the tab bar is hidden",
    navDisplay !== "none" && tabHidden === "none" && /dashboard/i.test(navText) && /account/i.test(navText),
    `nav ${navDisplay}, tabs ${tabHidden}, items ${navText}`,
  );

  for (const hashPart of ["/tutorials", "/training", "/terminology", "/skilltree", "/dashboard"]) {
    await page.evaluate((part) => {
      const link = [...document.querySelectorAll(".navbar__list a")].find((node) => (node.getAttribute("href") || "").includes(part));
      if (!link) throw new Error(`missing nav link ${part}`);
      link.click();
    }, hashPart);
    await page.waitForFunction((part) => location.hash.includes(part), { timeout: 10000 }, hashPart);
  }
  record("desktop navbar routes to tutorials, training, terminology, skills, and dashboard", true, await page.evaluate(() => location.hash));

  await page.goto(`${base}/#/training`, { waitUntil: "networkidle0" });
  const training = await text(page);
  await page.click("a[href='#/training/beginnerguide']");
  await page.waitForFunction(() => location.hash.includes("/training/beginnerguide"));
  record(
    "training guide link opens",
    (await page.evaluate(() => location.hash)).includes("beginnerguide"),
    training.slice(0, 80),
  );

  await page.goto(`${base}/#/tutorials`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("horizontal push"), { timeout: 15000 });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent.trim() === "Push-up");
    button.click();
  });
  await page.waitForSelector("a.skill-content--link", { timeout: 10000 });
  const tutorialHref = await page.$eval("a.skill-content--link", (el) => el.getAttribute("href"));
  await page.evaluate(() => document.querySelector("a.skill-content--link").click());
  await page.waitForFunction(() => location.hash.includes("/tutorials/"), { timeout: 10000 });
  record("tutorial link opens a skill page", (await page.evaluate(() => location.hash)).includes("/tutorials/"), tutorialHref || "");

  await page.goto(`${base}/#/terminology`, { waitUntil: "networkidle0" });
  record("terminology page renders", /terminology/i.test(await text(page)), (await text(page)).slice(0, 120));

  queries.length = 0;
  await page.goto(`${base}/#/workoutlog`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("NOVEMBER") || document.body.innerText.includes("No workouts"), { timeout: 15000 });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const loadQueries = queries.slice();
  record(
    "workout log load does not fetch every month",
    loadQueries.length > 0 && loadQueries.length <= 6,
    `${loadQueries.length} workout queries`,
  );

  const beforeExpand = queries.length;
  const opened = await page.evaluate(() => {
    const button = [...document.querySelectorAll(".wh-fold")].find((node) => !node.textContent.includes("2026") || node.textContent.includes("October") || node.textContent.match(/\d{4}/));
    const target = [...document.querySelectorAll(".wh-fold")].find((node) => /October|2025/.test(node.textContent))
      || document.querySelector(".wh-fold");
    if (!target) return "";
    target.click();
    return target.textContent.replace(/\s+/g, " ");
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const expandAdded = queries.length - beforeExpand;
  const beforeSecond = queries.length;
  await page.evaluate(() => {
    const open = document.querySelector(".wh-fold[aria-expanded='true']");
    if (open) open.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  await page.evaluate(() => {
    const closed = [...document.querySelectorAll(".wh-fold")].find((node) => node.getAttribute("aria-expanded") === "false");
    if (closed) closed.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const secondAdded = queries.length - beforeSecond;
  record(
    "expanding an older period fetches once and the next open is cached",
    Boolean(opened) && expandAdded >= 1 && secondAdded === 0,
    `opened ${opened}; first ${expandAdded}; second ${secondAdded}`,
  );

  await page.goto(`${base}/#/workoutlog`, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent.includes("Log workout"));
    button.click();
  });
  await page.waitForSelector("input[type=date]");
  await page.evaluate(() => {
    const name = document.querySelector(".wl-skill-select input");
    if (name) {
      name.focus();
    }
  });
  const nameInput = await page.$(".wl-skill-select input");
  await nameInput.type("Push-up");
  await page.keyboard.press("Enter");
  const sets = await page.$("input[placeholder='1–4']");
  await sets.click({ clickCount: 3 });
  await sets.type("1");
  const effort = await page.$("input[placeholder='reps']");
  await effort.type("8");
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((node) => node.textContent.trim() === "save workout").click();
  });
  await page.waitForFunction(() => /1 exercises/.test(document.body.innerText), { timeout: 15000 });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.goto(`${base}/#/dashboard`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => /1 day streak/i.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
  const afterLog = await text(page);
  record("manual log credits one day on the dashboard", /1 day streak/i.test(afterLog), afterLog.slice(0, 240));

  await page.goto(`${base}/#/settings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("#username");
  await page.click("#username", { clickCount: 3 });
  await page.type("#username", `UI ${String(Date.now()).slice(-6)}`);
  await page.click("button.settings-button--primary");
  let usernameText = "";
  try {
    await page.waitForFunction(() => /Username saved/i.test(document.body.innerText), { timeout: 10000 });
    usernameText = "Username saved.";
  } catch {
    usernameText = await page.evaluate(() =>
      [...document.querySelectorAll(".settings-message, .settings-help")].map((node) => node.textContent.trim()).join(" | "),
    );
  }
  record("settings username claim saves", /Username saved/i.test(usernameText), usernameText.slice(0, 240));

  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((node) => node.textContent.includes("sign out"))?.click();
  });
  await page.waitForFunction(() => location.hash === "#/" || location.hash === "" || document.body.innerText.includes("login"), { timeout: 10000 });
  await page.goto(`${base}/#/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button", { timeout: 10000 });
  const googleButtons = await page.$$eval("button", (nodes) => nodes.map((node) => node.textContent.trim()).filter((label) => /google/i.test(label)));
  let googleEvidence = `buttons: ${googleButtons.join(", ") || "none"}`;
  let googlePass = false;
  try {
    const popupPromise = new Promise((resolve) => page.once("popup", resolve));
    await page.evaluate(() => {
      [...document.querySelectorAll("button")].find((node) => /google/i.test(node.textContent)).click();
    });
    const popup = await Promise.race([
      popupPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("no popup")), 8000)),
    ]);
    await popup.waitForNetworkIdle({ timeout: 8000 }).catch(() => {});
    googleEvidence = `${popup.url()} ${(await popup.evaluate(() => document.body.innerText)).slice(0, 180)}`;
    const added = await popup.$("button, [role=button], li");
    if (added) await added.click().catch(() => {});
    await page.waitForFunction(() => location.hash.includes("/dashboard"), { timeout: 8000 }).catch(() => {});
    googlePass = (await page.evaluate(() => location.hash)).includes("/dashboard") || /emulator|account/i.test(googleEvidence);
  } catch (error) {
    googleEvidence = `${googleEvidence}; ${error.message}`;
  }
  record("Google sign-in reaches the emulator account chooser", googlePass, googleEvidence);

  const failed = results.filter((item) => !item.pass);
  console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  await browser.close();
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
