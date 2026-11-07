/// <reference lib="dom" />
import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Locators, gestures and frame sampling for the Deck interactions spec,
 * which drives the prototype's B and D variants in the playground.
 */

export const inspector = (page: Page) =>
	page.getByRole("complementary", { name: "Inspector" });
export const frame = (page: Page) => page.locator("[data-deck-frame]");
export const front = (page: Page) =>
	frame(page).locator("[data-card-id]").last();

export async function chooseVariant(page: Page, name: string) {
	await inspector(page).getByRole("button", { name, exact: true }).click();
}

/** Presses `card` near its top, moves to `to` slowly, rests, and lets go. */
export async function carry(
	page: Page,
	card: Locator,
	to: (start: { x: number; y: number }) => Promise<{ x: number; y: number }>,
) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 24 };
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 10, start.y + 10, { steps: 2 });
	const end = await to(start);
	await page.mouse.move(end.x, end.y, { steps: 25 });
	await page.waitForTimeout(150);
	await page.mouse.up();
}

/** The middle of a B target, once a carried Card has shown it. */
export async function targetCentre(page: Page, target: "tray" | "pad") {
	const box = await frame(page)
		.locator(`[data-target="${target}"]`)
		.last()
		.boundingBox();
	if (!box) throw new Error(`Missing ${target} geometry`);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Sets one of the variant's range knobs in the inspector. */
export async function setKnob(page: Page, label: string, value: number) {
	await inspector(page)
		.getByRole("slider", { name: label, exact: true })
		.fill(String(value));
}

/** The computed opacity of the layer D draws its Deck and panel in. */
export function layerOpacity(page: Page) {
	return frame(page)
		.locator("[data-deck-layer]")
		.evaluate((element) => Number(getComputedStyle(element).opacity));
}

/** Sets the inspector's Reduced motion to on: it defaults to off. */
export async function reduceMotion(page: Page) {
	await inspector(page)
		.getByRole("group", { name: "Reduced motion" })
		.getByRole("button", { name: "on", exact: true })
		.click();
}

export async function redeal(page: Page) {
	await inspector(page).getByRole("button", { name: "Re-deal" }).click();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
}

/** Presses `card` near its top and moves past the slop: the Card is in hand. */
export async function lift(page: Page, card: Locator) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 24 };
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 10, start.y + 10, { steps: 2 });
	return start;
}

/** The Card's rotation in degrees, read from its computed transform. */
export function rotation(card: Locator) {
	return card.evaluate((element) => {
		const matrix = new DOMMatrixReadOnly(
			getComputedStyle(element).transform,
		);
		return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
	});
}

/** Samples where `card`'s middle is, every frame for `ms`, as a share of the frame's width. */
export function farthestOut(card: Locator, ms: number) {
	return card.evaluate(
		(element, duration) =>
			new Promise<number>((resolve) => {
				const frameBox = element
					.closest("[data-deck-frame]")
					?.getBoundingClientRect();
				if (!frameBox) return resolve(Number.POSITIVE_INFINITY);
				let worst = 0;
				const end = performance.now() + duration;
				const step = () => {
					const box = element.getBoundingClientRect();
					const middle = box.left + box.width / 2;
					const out = Math.max(
						frameBox.left - middle,
						middle - frameBox.right,
						0,
					);
					worst = Math.max(worst, out / frameBox.width);
					if (performance.now() < end) requestAnimationFrame(step);
					else resolve(worst);
				};
				requestAnimationFrame(step);
			}),
		ms,
	);
}

export const panel = (page: Page) => frame(page).locator("[data-panel]");
export const lastRelease = (page: Page) =>
	inspector(page).locator('[data-readout="last release"]');

/** Presses `card` and pulls it by (dx, dy) slowly, then rests: no flick. */
export async function pull(page: Page, card: Locator, dx: number, dy: number) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 16 };
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + dx, start.y + dy, { steps: 30 });
	await page.waitForTimeout(150);
	return start;
}

/** Each Card's middle across and top edge, which the fold brings onto the swiped Card's. */
export function anchors(page: Page) {
	return frame(page)
		.locator("[data-card-id]")
		.evaluateAll((elements) =>
			elements.map((element) => {
				const box = element.getBoundingClientRect();
				return { u: box.left + box.width / 2, v: box.top };
			}),
		);
}

type Anchor = { u: number; v: number };

/** Waits until a deal has landed: every Card opaque, and none moving between two looks. */
export async function landed(page: Page) {
	await expect
		.poll(async () => {
			const before = await anchors(page);
			await page.waitForTimeout(32);
			const after = await anchors(page);
			const opaque = await styles(page, "opacity");
			return (
				opaque.every((own) => own === "1") &&
				before.every((at, index) => {
					const now = after[index];
					return now && Math.hypot(at.u - now.u, at.v - now.v) < 0.05;
				})
			);
		})
		.toBe(true);
}

/**
 * The share of the way every Card but Card `lead` (back to front, the
 * front one by default) has gone from `rest` to it.
 */
export async function shares(page: Page, rest: Anchor[], lead = 3) {
	const now = await anchors(page);
	const to = now[lead];
	if (!to) throw new Error("Missing the swiped Card");
	return now.flatMap((card, index) => {
		const slot = rest[index];
		if (!slot) throw new Error("Missing a slot");
		if (index === lead) return [];
		const way = { u: to.u - slot.u, v: to.v - slot.v };
		return [
			((card.u - slot.u) * way.u + (card.v - slot.v) * way.v) /
				(way.u * way.u + way.v * way.v),
		];
	});
}

/** The most any Card's anchor sits from Card `lead`'s, in px. */
export function spread(now: Anchor[], lead: number) {
	const to = now[lead];
	if (!to) throw new Error("Missing the swiped Card");
	return Math.max(
		...now.map((card) => Math.hypot(card.u - to.u, card.v - to.v)),
	);
}

/** The most any Card's anchor sits from where it rests, in px. */
export async function strayed(page: Page, rest: Anchor[]) {
	const now = await anchors(page);
	return Math.max(
		...now.map((card, index) => {
			const slot = rest[index];
			if (!slot) throw new Error("Missing a slot");
			return Math.hypot(card.u - slot.u, card.v - slot.v);
		}),
	);
}

/** Each Card's computed style for `property`, back to front. */
export function styles(
	page: Page,
	property: "transform" | "border-top-color" | "z-index" | "opacity",
) {
	return frame(page)
		.locator("[data-card-id]")
		.evaluateAll(
			(elements, key) =>
				elements.map((element) =>
					getComputedStyle(element).getPropertyValue(key),
				),
			property,
		);
}

type Stacking = {
	/** Frames sampled while every Card was still in the frame. */
	frames: number;
	/** Frames in which any Card's z-index differed from before. */
	restacked: number;
	/** Frames in which Close deck's panel showed at another z-index than Card `lead`. */
	panelOff: number;
	/** Frames in which any Card's own opacity was not 1. */
	faded: number;
};

/**
 * Every frame from now until the returned call: whether each Card's
 * z-index, which alone sets the Deck's paint order, is still what it is
 * now, whether Close deck's panel, while it shows, shares Card `lead`'s,
 * and whether any Card's own opacity left 1. Frames once the Deck has
 * gone are not counted.
 */
export async function watchStacking(page: Page, lead: number) {
	await frame(page).evaluate((deck, index) => {
		const cards = () => [...deck.querySelectorAll("[data-card-id]")];
		const z = (node: Element) => getComputedStyle(node).zIndex;
		const before = cards().map(z);
		const element = cards()[index];
		const seen: Stacking = {
			frames: 0,
			restacked: 0,
			panelOff: 0,
			faded: 0,
		};
		let live = true;
		const step = () => {
			if (!live) return;
			const now = cards();
			if (now.length === before.length) {
				seen.frames += 1;
				if (now.some((card, i) => z(card) !== before[i]))
					seen.restacked += 1;
				if (now.some((card) => getComputedStyle(card).opacity !== "1"))
					seen.faded += 1;
				const shown = deck.querySelector('[data-panel="dismiss"]');
				if (
					shown &&
					element &&
					Number(getComputedStyle(shown).opacity) > 0.01 &&
					z(shown) !== z(element)
				)
					seen.panelOff += 1;
			}
			requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
		Object.assign(window, {
			stacking: {
				seen,
				stop: () => {
					live = false;
				},
			},
		});
	}, lead);
	return () =>
		page.evaluate(() => {
			const { stacking } = window as unknown as {
				stacking: { seen: Stacking; stop: () => void };
			};
			stacking.stop();
			return stacking.seen;
		});
}

/** Which Card, back to front, is painted at the middle of `card`. */
export function topCardAt(card: Locator) {
	return card.evaluate((element) => {
		const box = element.getBoundingClientRect();
		const hit = document
			.elementFromPoint(
				box.left + box.width / 2,
				box.top + box.height / 2,
			)
			?.closest("[data-card-id]");
		const cards = [
			...(element
				.closest("[data-deck-frame]")
				?.querySelectorAll("[data-card-id]") ?? []),
		];
		return hit ? cards.indexOf(hit) : -1;
	});
}

export type Moment = {
	x: number;
	mid: number;
	top: number;
	right: number;
	bottom: number;
	lean: number;
};

/** From the next release on, `card`'s box and the most any other Card leans, every frame for `ms`. */
export async function watchRelease(card: Locator, ms: number) {
	await card.evaluate((element, duration) => {
		const lean = (other: Element) => {
			const m = new DOMMatrixReadOnly(getComputedStyle(other).transform);
			return Math.abs((Math.atan2(m.b, m.a) * 180) / Math.PI);
		};
		const others = [...document.querySelectorAll("[data-card-id]")].filter(
			(other) => other !== element,
		);
		const moments: Moment[] = [];
		let until = 0;
		const step = () => {
			const box = element.getBoundingClientRect();
			moments.push({
				x: box.left,
				mid: box.left + box.width / 2,
				top: box.top,
				right: box.right,
				bottom: box.bottom,
				lean: Math.max(...others.map(lean)),
			});
			if (performance.now() < until) requestAnimationFrame(step);
		};
		const start = () => {
			until = performance.now() + duration;
			step();
		};
		window.addEventListener("pointerup", start, {
			capture: true,
			once: true,
		});
		Object.assign(window, { released: moments });
	}, ms);
	return async () => {
		await card.page().waitForTimeout(ms + 100);
		return card.evaluate(
			() => (window as unknown as { released: Moment[] }).released,
		);
	};
}

/**
 * From the next release on, every frame for `ms` while `card` still shows
 * in the frame: the most any other Card's middle sits from `card`'s,
 * across. Resolves once the frames are in.
 */
export async function watchApart(card: Locator, ms: number) {
	await card.evaluate((element, duration) => {
		const frameBox = element
			.closest("[data-deck-frame]")
			?.getBoundingClientRect();
		const others = [...document.querySelectorAll("[data-card-id]")].filter(
			(other) => other !== element,
		);
		const middle = (box: DOMRect) => box.left + box.width / 2;
		const seen = { apart: 0, frames: 0 };
		let until = 0;
		const step = () => {
			const own = element.getBoundingClientRect();
			if (
				frameBox &&
				own.right > frameBox.left &&
				own.left < frameBox.right
			) {
				seen.frames += 1;
				for (const other of others)
					seen.apart = Math.max(
						seen.apart,
						Math.abs(
							middle(other.getBoundingClientRect()) - middle(own),
						),
					);
			}
			if (performance.now() < until) requestAnimationFrame(step);
		};
		window.addEventListener(
			"pointerup",
			() => {
				until = performance.now() + duration;
				step();
			},
			{ capture: true, once: true },
		);
		Object.assign(window, { apart: seen });
	}, ms);
	/* read off the page: the Deck may be gone by then */
	return async () => {
		await card.page().waitForTimeout(ms + 100);
		return card.page().evaluate(
			() =>
				(
					window as unknown as {
						apart: { apart: number; frames: number };
					}
				).apart,
		);
	};
}

type Exit = {
	/** Frames sampled until the Deck had gone. */
	frames: number;
	/** The most Card `lead` went past where it was let go, toward inline-start, in px. */
	toStart: number;
	/** The same toward inline-end. */
	toEnd: number;
	/** The least opacity any Card had of its own. */
	own: number;
	/** The Deck layer's opacity in the last frame the Deck showed in. */
	layer: number;
};

/**
 * From the next release on, every frame until the Deck has gone: how far
 * Card `lead` went past where it showed when the hand let go, each way
 * along the inline axis, the least opacity any Card had of its own, and
 * the Deck layer's opacity as it went. Resolves once the Deck has gone.
 */
export async function watchExit(page: Page, lead: number) {
	await frame(page).evaluate((deck, index) => {
		const toStart = getComputedStyle(deck).direction === "rtl" ? 1 : -1;
		const layer = deck.querySelector("[data-deck-layer]");
		const cards = () => [...deck.querySelectorAll("[data-card-id]")];
		const seen: Exit = {
			frames: 0,
			toStart: 0,
			toEnd: 0,
			own: 1,
			layer: 1,
		};
		let element: Element | undefined;
		let from = 0;
		const step = () => {
			if (!element?.isConnected) return;
			seen.frames += 1;
			const moved =
				(element.getBoundingClientRect().left - from) * toStart;
			seen.toStart = Math.max(seen.toStart, moved);
			seen.toEnd = Math.max(seen.toEnd, -moved);
			for (const card of cards())
				seen.own = Math.min(
					seen.own,
					Number(getComputedStyle(card).opacity),
				);
			if (layer) seen.layer = Number(getComputedStyle(layer).opacity);
			requestAnimationFrame(step);
		};
		window.addEventListener(
			"pointerup",
			() => {
				element = cards()[index];
				from = element?.getBoundingClientRect().left ?? 0;
				requestAnimationFrame(step);
			},
			{ capture: true, once: true },
		);
		Object.assign(window, { exit: seen });
	}, lead);
	return async () => {
		await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
		return page.evaluate(() => (window as unknown as { exit: Exit }).exit);
	};
}
