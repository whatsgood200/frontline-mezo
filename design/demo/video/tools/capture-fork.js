// Captures the fork-demo shots at 1920x1080 (1440x810 CSS px at 4/3 scale, like 133% zoom).
const { chromium } = require("C:/Users/HP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "shots");
const BASE = "http://localhost:3125";

const shot = async (page, name) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  console.log("shot", name);
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);

  // Connect the fork demo wallet.
  await page.goto(BASE + "/borrow", { waitUntil: "networkidle" });
  const balance = page.getByText(/Wallet: [\d,]+\.\d+ BTC/);
  // The fork demo wallet connects on its own; the balance read is slow on a cold fork.
  await page.getByRole("button", { name: /^0x[0-9a-fA-F]{2}/ }).first().waitFor({ timeout: 60000 });
  await balance.waitFor();

  // Borrow: type the amounts, read the quote, open the loan.
  const btc = page.getByLabel("BTC to lock");
  const musd = page.getByLabel("MUSD to receive");
  await btc.fill("");
  await musd.fill("");
  await shot(page, "f_borrow_0");
  await btc.pressSequentially("0.2", { delay: 120 });
  await shot(page, "f_borrow_1");
  await musd.pressSequentially("6000", { delay: 120 });
  await page.getByText("guaranteed").first().waitFor();
  await page.waitForTimeout(2500);
  await shot(page, "f_borrow_2");
  await page.getByRole("button", { name: /Lock .* and borrow/ }).click();
  await page.getByText(/Confirmed on the local fork/).waitFor();
  await shot(page, "f_borrow_3");

  // Redeem Lab: preview, then run 5,000 MUSD.
  await page.goto(BASE + "/lab", { waitUntil: "networkidle" });
  await page.getByText("It stops at").waitFor();
  await page.getByText("Absorber loan 1").first().waitFor();
  await page.waitForTimeout(2500);
  await shot(page, "f_lab_0");
  await page.getByRole("button", { name: /Redeem 5,000 MUSD for BTC/ }).click();
  await page.getByText(/Confirmed on the local fork/).waitFor();
  await page.waitForTimeout(4000);
  await shot(page, "f_lab_1");

  // My loan after the redemption.
  await page.goto(BASE + "/loan", { waitUntil: "networkidle" });
  await page.getByText("Loan health").waitFor();
  await page.getByText(/guaranteed/).first().waitFor();
  await page.waitForTimeout(2500);
  await shot(page, "f_loan_after");

  // Proof: Frontline transactions.
  await page.goto(BASE + "/proof", { waitUntil: "networkidle" });
  await page.getByText(/Redemption took/).waitFor();
  await page.getByRole("heading", { name: "Frontline transactions" }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -80));
  await shot(page, "f_proof");

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
