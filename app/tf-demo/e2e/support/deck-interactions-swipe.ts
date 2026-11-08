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
import { type Sample, tailOf, tapAt } from "./deck-interactions-tap";

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

type Edges = { l: number; r: number; t: number; b: number };

function edgesOf(box: { u: number; v: number; w: number; h: number }): Edges {
	return {
		l: box.u - box.w / 2,
		r: box.u + box.w / 2,
		t: box.v - box.h / 2,
		b: box.v + box.h / 2,
	};
}

/**
 * How much of D's panel paints in `sample`, in px²: the part of it its
 * clip leaves that no opaque Card is drawn over. It is the first thing in
 * the Deck's layer, so a Card at its z-index or above is drawn over it.
 */
function panelShows(sample: Sample): number {
	const panel = sample.panel;
	if (!panel || panel.o <= 0.01) return 0;
	const own = edgesOf(panel);
	const over = sample.cards
		.filter((card) => card.z >= panel.z && card.o >= 0.99)
		.map(edgesOf);
	const cuts = (from: number, to: number, ends: readonly number[]) =>
		[
			...new Set([
				from,
				to,
				...ends.filter((at) => at > from && at < to),
			]),
		].sort((a, b) => a - b);
	const xs = cuts(
		own.l,
		own.r,
		over.flatMap((card) => [card.l, card.r]),
	);
	const ys = cuts(
		own.t,
		own.b,
		over.flatMap((card) => [card.t, card.b]),
	);
	let area = 0;
	for (let i = 1; i < xs.length; i++)
		for (let j = 1; j < ys.length; j++) {
			const [x0 = 0, x1 = 0, y0 = 0, y1 = 0] = [
				xs[i - 1],
				xs[i],
				ys[j - 1],
				ys[j],
			];
			const x = (x0 + x1) / 2;
			const y = (y0 + y1) / 2;
			const covered = over.some(
				(card) => x > card.l && x < card.r && y > card.t && y < card.b,
			);
			if (!covered) area += (x1 - x0) * (y1 - y0);
		}
	return area;
}

/**
 * What D's panel did over a swipe recorded in `samples`, frame by frame:
 * `frames` it painted in; `grew`, the most it showed, once the swipe's
 * hand let go, beyond the least it had shown since the last frame the
 * hand held it, in px²; `under`, frames in which it painted over a Card
 * drawn over it in its first frame; `flooded`, frames in which its
 * colour had moved from its first frame's before it armed.
 */
export function panelPath(samples: readonly Sample[]) {
	const first = samples.findIndex((sample) => sample.panel !== null);
	const start = samples[first];
	if (!start?.panel) throw new Error("No panel showed");
	const { presses } = start;
	const over = start.cards
		.filter((card) => card.z >= (start.panel?.z ?? 0))
		.map((card) => card.id);
	const release = samples.findIndex(
		(sample, index) =>
			index > first && (sample.presses > presses || !sample.down),
	);
	if (release < 1) throw new Error("The hand never let go");
	let least = panelShows(samples[release - 1] as Sample);
	let grew = 0;
	for (const sample of samples.slice(release)) {
		const shows = panelShows(sample);
		grew = Math.max(grew, shows - least);
		least = Math.min(least, shows);
	}
	let armed = false;
	let frames = 0;
	let under = 0;
	let flooded = 0;
	for (const sample of samples.slice(first)) {
		const { panel } = sample;
		if (!panel || panel.o <= 0.01) continue;
		frames += 1;
		armed ||= panel.armed;
		if (!armed && Math.abs(panel.fill - start.panel.fill) > 0.005)
			flooded += 1;
		const below = sample.cards.some(
			(card) => over.includes(card.id) && card.z < panel.z,
		);
		if (below && panelShows(sample) > 0) under += 1;
	}
	return { frames, grew, under, flooded };
}

/** The Card `id` in the Deck, wherever a shuffle has put it. */
const byId = (page: Page, id: string) =>
	frame(page).locator(`[data-card-id="${id}"]`);

/**
 * Ways to drag Card `id` up, toward Open, each from rest: slowly past the
 * threshold and let go; flicked up and let go moving; tapped, which
 * shuffles it to the front, then at once dragged up past the threshold;
 * dragged up short of it and let go, then, while it comes home, the
 * backmost Card tapped. Each resolves once its hand has let go.
 */
export const UPS = {
	past: async (page: Page, id: string) => {
		await pull(page, byId(page, id), 0, -150);
		await page.mouse.up();
	},
	flick: async (page: Page, id: string) => {
		const box = await byId(page, id).boundingBox();
		if (!box) throw new Error("Missing card geometry");
		const start = { x: box.x + box.width / 2, y: box.y + 16 };
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		for (const dy of [20, 60, 110, 160]) {
			await page.mouse.move(start.x, start.y - dy);
			await page.waitForTimeout(16);
		}
		await page.mouse.up();
	},
	"tap, then past": async (page: Page, id: string) => {
		await tapAt(page, await tailOf(byId(page, id)));
		await page.waitForTimeout(60);
		await pull(page, byId(page, id), 0, -150);
		await page.mouse.up();
	},
	"short, then a tap": async (page: Page, id: string) => {
		await pull(page, byId(page, id), 0, -60);
		await page.mouse.up();
		await page.waitForTimeout(80);
		await tapAt(page, await tailOf(card(page, 0)));
	},
} as const;
