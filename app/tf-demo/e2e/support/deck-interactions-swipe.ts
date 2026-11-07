/// <reference lib="dom" />
import { expect, type Page } from "@playwright/test";
import {
	frame,
	inspector,
	landed,
	panel,
	pull,
	redeal,
} from "./deck-interactions";

/**
 * D's swipes in the Deck interactions spec: every way a Card goes, and a
 * frame-by-frame watch on the panel it uncovers.
 */

export const DIRECTIONS = ["LTR", "RTL"] as const;

export async function direct(page: Page, to: (typeof DIRECTIONS)[number]) {
	await inspector(page)
		.getByRole("button", { name: to, exact: true })
		.click();
}

const card = (page: Page, index: number) =>
	frame(page).locator("[data-card-id]").nth(index);

const SWIPES = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/**
 * What a full swipe each way does to Card `lead`, back to front: the
 * action its panel shows, whether armed, and what the release does. The
 * Deck is dealt again, or the Card closed, after each.
 */
export async function movesOf(page: Page, lead: number) {
	const open = frame(page).locator("[data-expanded]");
	const moves: Record<string, string> = {};
	for (const [way, [x = 0, y = 0]] of Object.entries(SWIPES)) {
		await landed(page);
		await pull(page, card(page, lead), x * 150, y * 150);
		const shown = (await panel(page).count()) > 0;
		const zone = shown ? await panel(page).getAttribute("data-panel") : "-";
		const armed = shown && (await panel(page).getAttribute("data-armed"));
		await page.mouse.up();
		await expect(panel(page)).toHaveCount(0);
		const left = await frame(page).locator("[data-card-id]").count();
		const opened = await open.count();
		const did = left ? (opened ? "opens" : "stays") : "closes";
		moves[way] = `${zone}${armed ? " armed" : ""}, ${did}`;
		if (!left) await redeal(page);
		if (opened) {
			await frame(page).getByRole("button", { name: "Close" }).click();
			await expect(open).toHaveCount(0);
		}
	}
	return moves;
}

type Seen = {
	/** Frames in which Card `lead`'s panel showed. */
	frames: number;
	/** The most the panel's edges across the swipe strayed from the Card's shown box less its border, in px. */
	fit: number;
	/** Frames counted toward `drift`: the panel armed 300 ms or more. */
	still: number;
	/** The most the icon's or label's middle moved over those frames, in px. */
	drift: number;
	/** How far the Card travelled over those frames, in px. */
	travel: number;
};

/**
 * Every frame from now until the returned call, while Card `lead`'s
 * panel shows along `axis`: how its edges fit the Card's, and, once it
 * has been armed (full, with its pop over) for 300 ms, how far its icon
 * and label move while the Card travels on.
 */
async function watchPanel(page: Page, lead: number, axis: string) {
	await frame(page).evaluate(
		(deck, [index, along]) => {
			const own = deck.querySelectorAll("[data-card-id]")[Number(index)];
			const id = own?.getAttribute("data-card-id");
			const parts = ["[data-panel-icon] svg", "[data-panel-label]"];
			const mid = (box: DOMRect) => ({
				x: box.x + box.width / 2,
				y: box.y + box.height / 2,
			});
			let first: ({ x: number; y: number } | undefined)[] | null = null;
			let from: DOMRect | null = null;
			let armedAt = Number.POSITIVE_INFINITY;
			const seen: Seen = {
				frames: 0,
				fit: 0,
				still: 0,
				drift: 0,
				travel: 0,
			};
			let live = true;
			const step = () => {
				if (!live) return;
				const shown = deck.querySelector(`[data-panel-card="${id}"]`);
				if (shown && own) {
					seen.frames += 1;
					const style = getComputedStyle(own);
					const scale = new DOMMatrixReadOnly(style.transform).a;
					const border =
						Number.parseFloat(style.borderTopWidth) * scale;
					const card = own.getBoundingClientRect();
					const box = shown.getBoundingClientRect();
					const [a, b] =
						along === "inline"
							? ([
									box.top - card.top,
									card.bottom - box.bottom,
								] as const)
							: ([
									box.left - card.left,
									card.right - box.right,
								] as const);
					seen.fit = Math.max(
						seen.fit,
						Math.abs(a - border),
						Math.abs(b - border),
					);
					const now = performance.now();
					if (!shown.hasAttribute("data-armed")) {
						armedAt = Number.POSITIVE_INFINITY;
						first = null;
					} else if (armedAt === Number.POSITIVE_INFINITY)
						armedAt = now;
					if (now - armedAt >= 300) {
						const at = parts.map((part) => {
							const element = shown.querySelector(part);
							return (
								element && mid(element.getBoundingClientRect())
							);
						});
						first ??= at.map((point) => point ?? undefined);
						from ??= card;
						seen.still += 1;
						seen.travel = Math.max(
							seen.travel,
							Math.hypot(
								card.left - from.left,
								card.top - from.top,
							),
						);
						at.forEach((point, i) => {
							const was = first?.[i];
							if (point && was)
								seen.drift = Math.max(
									seen.drift,
									Math.hypot(
										point.x - was.x,
										point.y - was.y,
									),
								);
						});
					}
				}
				requestAnimationFrame(step);
			};
			requestAnimationFrame(step);
			Object.assign(window, {
				watched: { seen, stop: () => (live = false) },
			});
		},
		[String(lead), axis],
	);
	return () =>
		page.evaluate(() => {
			const { watched } = window as unknown as {
				watched: { seen: Seen; stop: () => void };
			};
			watched.stop();
			return watched.seen;
		});
}

/** Each Card back to front, and the way it goes. */
export const WAYS = [
	[3, -1, 0],
	[3, 1, 0],
	[3, 0, -1],
	[3, 0, 1],
	[0, -1, 0],
	[1, 0, 1],
	[2, 1, 0],
] as const;

/**
 * Card `lead` swiped (x, y) slowly: held short, then armed, held while the
 * pop plays out, carried on 120 px, back under the threshold and let go.
 * Resolves once it is home, with what its panel did meanwhile.
 */
export async function sweep(page: Page, lead: number, x: number, y: number) {
	await landed(page);
	const watched = await watchPanel(page, lead, x ? "inline" : "block");
	const start = await pull(page, card(page, lead), x * 60, y * 60);
	const to = async (px: number) => {
		await page.mouse.move(start.x + x * px, start.y + y * px, {
			steps: 20,
		});
		await page.waitForTimeout(150);
	};
	await to(120);
	await page.waitForTimeout(250);
	await to(240);
	await to(30);
	await page.mouse.up();
	await expect(panel(page)).toHaveCount(0);
	return watched();
}

/**
 * Card 1 pulled 90 px toward Close deck and let go: the front Card,
 * folded nearly to its scale, grows back to its own on the way home, and
 * is swiped toward Close deck meanwhile. What its panel did as it went.
 */
export async function sweepGrowing(page: Page) {
	await landed(page);
	await pull(page, card(page, 1), -90, 0);
	await page.mouse.up();
	const watched = await watchPanel(page, 3, "inline");
	const start = await pull(page, card(page, 3), -40, 0);
	await page.mouse.move(start.x - 140, start.y, { steps: 20 });
	const seen = await watched();
	await page.mouse.up();
	return seen;
}
