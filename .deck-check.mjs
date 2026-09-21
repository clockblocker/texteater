import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: "no-preference" });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("http://localhost:5174/playground/deck-models");
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/deck-0.png" });
// find the reader words
const words = await page.locator("[data-word]").count();
const sentences = await page.locator("[data-sentence]").count();
console.log({ words, sentences, errors });
// click a word in the last sentence
const last = page.locator("[data-sentence]").last().locator("[data-word]").first();
const before = await last.boundingBox();
await last.click();
await page.waitForTimeout(1200);
const after = await last.boundingBox();
const card = await page.locator('[data-form="card"]').first().boundingBox();
console.log({ before, after, card });
await page.screenshot({ path: "/tmp/deck-1.png" });
// click a word in the first sentence: should not move
const first = page.locator("[data-sentence]").first().locator("[data-word]").nth(1);
const b2 = await first.boundingBox();
await first.click();
await page.waitForTimeout(1200);
const a2 = await first.boundingBox();
const card2 = await page.locator('[data-form="card"]').first().boundingBox();
console.log({ b2, a2, card2 });
await page.screenshot({ path: "/tmp/deck-2.png" });
console.log({ errors });
await browser.close();
