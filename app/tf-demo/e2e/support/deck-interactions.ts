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
	property: "transform" | "border-top-color" | "z-index",
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

/**
 * Every frame from now until the hand lets go, while Close deck's panel
 * shows: how often another Card stood level with or over `card` or its
 * panel, or, once it had come all the way forward, covered a point on it.
 */
export async function watchCover(card: Locator) {
	await card.evaluate((element) => {
		const seen = { frames: 0, covered: 0 };
		let live = true;
		const z = (node: Element) => Number(getComputedStyle(node).zIndex);
		/* how many of three points on it another Card covers */
		const missed = () => {
			const box = element.getBoundingClientRect();
			const points = [
				[box.left + 12, box.top + 12],
				[box.left + box.width / 2, box.top + box.height / 2],
				[box.right - 12, box.bottom - 12],
			] as const;
			return points.filter(
				([x, y]) =>
					document
						.elementFromPoint(x, y)
						?.closest("[data-card-id]") !== element,
			).length;
		};
		/* how often another Card stands level with or over it or its panel */
		const under = (shown: Element) => {
			const others = [
				...document.querySelectorAll("[data-card-id]"),
			].filter((other) => other !== element);
			const top = Math.max(...others.map(z));
			return z(element) <= top || z(shown) <= top ? 1 : 0;
		};
		const step = () => {
			const shown = document.querySelector('[data-panel="dismiss"]');
			if (shown && Number(getComputedStyle(shown).opacity) > 0.01) {
				seen.frames += 1;
				const covered = under(shown);
				seen.covered +=
					covered ||
					(getComputedStyle(element).maskImage === "none"
						? missed()
						: 0);
			}
			if (live) requestAnimationFrame(step);
		};
		window.addEventListener("pointerup", () => (live = false), {
			capture: true,
			once: true,
		});
		requestAnimationFrame(step);
		Object.assign(window, { cover: seen });
	});
	return () =>
		card.evaluate(
			() =>
				(
					window as unknown as {
						cover: { frames: number; covered: number };
					}
				).cover,
		);
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
	return async () => {
		await card.page().waitForTimeout(ms + 100);
		return card.evaluate(
			() =>
				(
					window as unknown as {
						apart: { apart: number; frames: number };
					}
				).apart,
		);
	};
}
