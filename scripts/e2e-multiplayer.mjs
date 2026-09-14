import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots";
fs.mkdirSync(OUT, { recursive: true });

async function login(page, username, password) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Enter online arcade/i }).click();
  await page.getByRole("button", { name: new RegExp(username, "i") }).waitFor({ timeout: 20000 });
}

async function openOnline(page, gameTitle) {
  await page.getByRole("button", { name: new RegExp(gameTitle, "i") }).click();
  const online = page.getByRole("button", { name: /Online multiplayer/i });
  if (await online.count()) await online.click();
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const a = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const b = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  a.on("pageerror", (e) => console.log("A", e.message));
  b.on("pageerror", (e) => console.log("B", e.message));

  console.log("login A");
  await login(a, "rival_alpha", "testpass123");
  await a.screenshot({ path: path.join(OUT, "mp-01-alpha.png"), fullPage: true });
  console.log("login B");
  await login(b, "rival_beta", "testpass123");
  await b.screenshot({ path: path.join(OUT, "mp-02-beta.png"), fullPage: true });

  await openOnline(a, "Xs & Os");
  await a.getByRole("button", { name: /Create room/i }).click();
  await a.getByText(/Room code/i).waitFor({ timeout: 15000 });
  const code = (await a.locator("body").innerText()).match(/\b[A-Z0-9]{6}\b/)?.[0];
  if (!code) throw new Error("No room code");
  console.log("code", code);
  await a.screenshot({ path: path.join(OUT, "mp-03-lobby-a.png") });

  await openOnline(b, "Xs & Os");
  await b.getByPlaceholder(/ROOM CODE/i).fill(code);
  await b.getByRole("button", { name: /^Join$/i }).click();
  // Must be in lobby (not just code sitting in the input)
  await b.getByText(/Waiting for host|Ready up|Leave/i).first().waitFor({ timeout: 15000 });
  await b.getByText(new RegExp(`Seat.*${code}|Room code`, "i")).first().waitFor({ timeout: 5000 }).catch(() => {});
  console.log("B lobby text sample:", (await b.locator("body").innerText()).slice(0, 400));
  await b.screenshot({ path: path.join(OUT, "mp-04-lobby-b.png") });

  // Wait until host sees 2 players
  await a.getByRole("button", { name: /Start match \(2\//i }).waitFor({ timeout: 20000 });
  if (await b.getByRole("button", { name: /Ready up/i }).count()) {
    await b.getByRole("button", { name: /Ready up/i }).click();
  }
  await a.getByRole("button", { name: /Start match/i }).click();
  await a.waitForTimeout(1500);
  await a.screenshot({ path: path.join(OUT, "mp-05-started-a.png") });
  await b.screenshot({ path: path.join(OUT, "mp-06-started-b.png") });

  const cellsA = a.locator("button.btn-chunky.aspect-square");
  const cellsB = b.locator("button.btn-chunky.aspect-square");
  console.log("cells A/B", await cellsA.count(), await cellsB.count());
  await cellsA.nth(4).click();
  await b.waitForTimeout(1500);
  await cellsB.nth(0).click();
  await a.waitForTimeout(1500);
  await a.screenshot({ path: path.join(OUT, "mp-07-synced-a.png") });
  await b.screenshot({ path: path.join(OUT, "mp-08-synced-b.png") });

  const textA = await a.locator("body").innerText();
  const textB = await b.locator("body").innerText();
  if (!textA.includes("X") || !textB.includes("X")) throw new Error("Board did not sync X");
  if (!textA.includes("O") || !textB.includes("O")) throw new Error("Board did not sync O");
  console.log("PASS real online multiplayer sync");
  await browser.close();
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
