// Renders the video's title and information cards at 1920x1080 in the deck's look.
const { chromium } = require("C:/Users/HP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const path = require("path");
const OUT = path.join(__dirname, "shots");

const page = (body, bg = "#12161c", fg = "#f4f5f7") => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..700&display=swap">
<style>
*{box-sizing:border-box;margin:0}
body{width:1920px;height:1080px;background:${bg};color:${fg};font-family:Geist,Arial,sans-serif;padding:128px;display:flex;flex-direction:column;gap:48px}
.eyebrow{font-family:'Geist Mono',monospace;font-size:24px;letter-spacing:2px;text-transform:uppercase;color:#f07a2e}
h1{font-size:120px;font-weight:700;line-height:1.05}
h2{font-size:72px;font-weight:700;line-height:1.1}
.muted{color:#bfc5ce}
.bar{display:flex;gap:12px}.bar div{height:28px;border-radius:6px}
.o{background:#e8590c}.g{background:#4f5763}.b{background:#1f5fbf}
.row{display:flex;gap:32px}
.card{flex:1;border-radius:16px;padding:40px;display:flex;flex-direction:column;gap:14px}
.card h3{font-size:36px}
.card p{font-size:28px;line-height:1.4}
.mono{font-family:'Geist Mono',monospace}
</style></head><body>${body}</body></html>`;

const bar = `<div class="bar"><div class="o" style="width:220px"></div><div class="o" style="width:180px"></div><div class="g" style="width:120px"></div><div class="g" style="width:90px"></div><div class="b" style="width:160px"></div><div class="b" style="width:240px"></div><div class="b" style="width:130px"></div></div>`;

const cards = {
  c_t1: page(`<div style="flex:1"></div><h1 class="mono">1,310 redemptions.</h1><p style="font-size:32px" class="muted">Loans hit by MUSD redemptions on Mezo mainnet, all time.</p><div style="flex:1"></div>`),
  c_t2: page(`<div style="flex:1"></div><h1 class="mono">1,310 redemptions.</h1><h1 class="mono" style="color:#f07a2e">28 liquidations.</h1><p style="font-size:32px" class="muted">Source: Mezo mainnet TroveManager events, read 5 Nov 2026.</p><div style="flex:1"></div>`),
  c_arch: page(`<p class="eyebrow">How it works</p><h2>Frontline does not change MUSD</h2>
    <div class="row" style="align-items:stretch">
      <div class="card" style="background:#1d232c"><h3>Web app</h3><p class="muted">Next.js and Mezo Passport, including Bitcoin wallets. Simulates every write; shows only confirmed state.</p></div>
      <div class="card" style="background:#1d232c;border:2px solid #f4f5f7;flex:1.4"><h3>Frontline contracts</h3><p><span style="color:#f07a2e">AbsorberVault</span> owns absorber troves in a 112 to 115% band. <span style="color:#8fb4ee">ProtectedLoanFactory</span> gives each borrower a loan held at 150% or more.</p></div>
      <div class="card" style="background:#1d232c"><h3>MUSD on Mezo</h3><p class="muted">TroveManager redeems from the lowest ratio up, so it reaches absorbers first.</p></div>
    </div>
    <p style="font-size:28px" class="muted">A keeper runs every 10 minutes; the safety actions are open to anyone.</p>`),
  c_tested: page(`<p class="eyebrow">Built and tested</p><h2>Checked against the real MUSD contracts</h2>
    <div class="row">
      <div class="card" style="background:#1d232c"><p class="mono" style="font-size:72px;font-weight:600">36</p><p class="muted">contract tests, 30 of them end to end on a Mezo testnet fork</p></div>
      <div class="card" style="background:#1d232c"><p class="mono" style="font-size:72px;font-weight:600">1 + 2</p><p class="muted">High and Medium issues found in a self-review, fixed with tests, redeployed</p></div>
      <div class="card" style="background:#1d232c"><p class="mono" style="font-size:72px;font-weight:600">3</p><p class="muted">contracts source-verified on the Mezo testnet explorer</p></div>
    </div>`),
  c_next: page(`<p class="eyebrow">Next</p><h2>From testnet to a capped mainnet launch</h2>
    <div class="row">
      <div class="card" style="background:#1d232c"><p class="mono" style="color:#f07a2e;font-size:28px">By 12 Nov 2026</p><h3>Outside users on testnet</h3></div>
      <div class="card" style="background:#1d232c"><p class="mono" style="color:#f07a2e;font-size:28px">December 2026</p><h3>Capped mainnet launch</h3></div>
      <div class="card" style="background:#1d232c"><p class="mono" style="color:#f07a2e;font-size:28px">Q1 2027</p><h3>Protocol share of the premium</h3></div>
    </div>`),
  c_end: page(`<p class="eyebrow">Mezo Buildathon · Wave 2</p><div style="flex:1"></div><h1>Frontline</h1><p style="font-size:44px">A redemption market for MUSD.</p><div style="flex:1"></div>${bar}<p class="mono muted" style="font-size:28px">frontline-mezo.vercel.app · github.com/whatsgood200/frontline-mezo</p>`),
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const [name, html] of Object.entries(cards)) {
    await p.setContent(html, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, name + ".png") });
    console.log("card", name);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
