// Live-site shots plus the fork Redeem Lab table after the redemption.
const { chromium } = require("C:/Users/HP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "shots");
const LIVE = "https://frontline-mezo.vercel.app";

const shot = async (page, name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  console.log("shot", name);
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);

  // Fork: the line table after the redemption.
  await page.goto("http://localhost:3125/lab", { waitUntil: "networkidle" });
  await page.getByText("Absorber loan 1").first().waitFor();
  await page.waitForTimeout(3000);
  await page.getByRole("heading", { name: /The redemption line, front first/ }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -40));
  await shot(page, "f_lab_table_after");

  // Live: home hero and the queue preview at two sizes.
  await page.goto(LIVE + "/", { waitUntil: "networkidle" });
  await page.getByText("It stops at").waitFor();
  await page.waitForTimeout(2500);
  await shot(page, "l_home_top");
  const preview = page.getByText("It stops at");
  await preview.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -220));
  await page.getByRole("button", { name: "5,000 MUSD", exact: true }).click();
  await shot(page, "l_queue_5k");
  await page.getByRole("button", { name: "30,000 MUSD", exact: true }).click();
  await shot(page, "l_queue_30k");

  // Live: the mainnet stats band on the home page.
  await page.getByText(/Why the line matters/).scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollBy(0, -200));
  await shot(page, "l_home_stats");

  // Live: absorb quote for 0.5 BTC.
  await page.goto(LIVE + "/absorb", { waitUntil: "networkidle" });
  await page.getByText("SHARE PRICE").waitFor();
  await page.getByLabel(/BTC to deposit/).fill("0.5");
  await page.getByText(/Absorber debt it backs/).waitFor();
  await page.waitForTimeout(2500);
  await shot(page, "l_absorb");

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
