import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:4175";
const FOOTER = 64; // --card-footer-height = calc(var(--spacing) * 16) = 4rem
const LONG_TEXT = [
	"Die Banken sind geöffnet.",
	"Morgen bleiben sie geschlossen.",
	"Der Lehrer schreibt die Wörter an die Tafel.",
	"Die Schüler schreiben die Wörter in ihre Hefte.",
	"Nach der Schule gehen die Kinder auf den Spielplatz.",
	"Die Eltern warten vor dem Tor und lesen die Zeitung.",
	"Am Abend kocht die Familie das Abendessen in der Küche.",
	"Der Hund schläft unter dem Tisch und träumt von Knochen.",
	"Die Katze sitzt auf dem Sofa und beobachtet die Vögel.",
].join(" ");

const browser = await chromium.launch();
const page = await browser.newPage({
	viewport: { width: 1440, height: 900 },
});
page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));

await page.goto(BASE);
const longTextCard = page
	.getByRole("region", { name: "Stored texts" })
	.getByRole("button")
	.filter({ hasText: "Spielplatz" });
if (await longTextCard.count()) {
	await longTextCard.first().click();
} else {
	await page.getByRole("button", { name: "Add a text" }).click();
	await page
		.getByRole("dialog")
		.getByRole("textbox", { name: "German text" })
		.fill(LONG_TEXT);
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Analyze text" })
		.click();
}
await page.waitForSelector("[data-sheet-id]", { timeout: 90_000 });
await page.keyboard.press("Escape");
await page.waitForSelector(
	'[data-workspace-pane="central"] article p button',
	{ timeout: 60_000 },
);

const segments = page.locator("article p button");
await segments.nth(8).click();
await page.waitForSelector('[data-card-layer="central"]');
await page.waitForTimeout(300);

function measure() {
	return page.evaluate(() => {
		const pane = document.querySelector(
			'[data-workspace-pane="central"]',
		) as HTMLElement | null;
		const layer = document.querySelector(
			'[data-card-layer="central"]',
		) as HTMLElement | null;
		const cards = layer ? [...layer.querySelectorAll("[data-card-id]")] : [];
		const content = layer?.querySelector(
			".card-sheet-workspace__card-content",
		) as HTMLElement | null;
		const subject = content?.querySelector(
			'[data-subject-presentation="Card"]',
		) as HTMLElement | null;
		const subjectChild = subject?.firstElementChild as HTMLElement | null;
		if (!pane || !layer || !content || !subject || !subjectChild) return null;
		const paneRect = pane.getBoundingClientRect();
		const layerRect = layer.getBoundingClientRect();
		const cardRects = cards.map((card) =>
			card.getBoundingClientRect().toJSON(),
		);
		return {
			paneHeight: paneRect.height,
			deckSize: getComputedStyle(layer).getPropertyValue("--deck-size"),
			layerHeight: layerRect.height,
			layerHeightRatio: layerRect.height / paneRect.height,
			cardCount: cards.length,
			topCardHeight: cardRects[0]?.height,
			topCardHeightRatio: cardRects[0]?.height / paneRect.height,
			cardOffsets: cardRects.map((rect) => rect.top - layerRect.top),
			cardHeights: cardRects.map((rect) => rect.height),
			layerBottomInsidePane:
				layerRect.bottom <= paneRect.bottom + 1 && layerRect.top >= paneRect.top - 1,
			// fill check: the subject view's own background box vs the card content box
			subjectChildBottomGap:
				content.getBoundingClientRect().bottom -
				subjectChild.getBoundingClientRect().bottom,
			subjectChildHeight: subjectChild.getBoundingClientRect().height,
			contentHeight: content.getBoundingClientRect().height,
		};
	});
}

const result = await measure();
console.log(JSON.stringify(result, null, 2));
await page.screenshot({ path: "verify-deck.png" });

// Expected for deck of N cards:
//   layerHeight  = 0.4 * paneHeight + FOOTER * (N - 1)
//   topCardHeight = 0.4 * paneHeight
//   card i offset = i * FOOTER
//   subjectChildBottomGap = 0 (content fills the card; no grey band)
if (result) {
	const n = result.cardCount;
	const expectedLayer = 0.4 * result.paneHeight + FOOTER * (n - 1);
	const expectedTop = 0.4 * result.paneHeight;
	console.log("deck size var:", JSON.stringify(result.deckSize.trim()));
	console.log("layer height expected/actual:", expectedLayer, result.layerHeight);
	console.log("top card expected/actual:", expectedTop, result.topCardHeight);
	console.log("card offsets expected:", Array.from({ length: n }, (_, i) => i * FOOTER));
	console.log("subject fills card (gap should be 0):", result.subjectChildBottomGap);
}

await browser.close();
