const { chromium } = require("C:/Users/HP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "shots");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(180000);
  // Fork lab: table near the top of the frame.
  await p.goto("http://localhost:3125/lab", { waitUntil: "networkidle" });
  await p.getByText("Absorber loan 1").first().waitFor();
  await p.waitForTimeout(3000);
  const h = p.getByRole("heading", { name: /The redemption line, front first/ });
  await h.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120));
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, "f_lab_table_after.png") });
  console.log("shot f_lab_table_after");
  // Live home: mainnet stats band in the middle of the frame.
  await p.goto("https://frontline-mezo.vercel.app/", { waitUntil: "networkidle" });
  await p.getByText("It stops at").waitFor();
  const band = p.getByText(/Why the line matters/);
  await band.waitFor();
  await p.waitForTimeout(2500);
  await band.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 260));
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(OUT, "l_home_stats.png") });
  console.log("shot l_home_stats");
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
