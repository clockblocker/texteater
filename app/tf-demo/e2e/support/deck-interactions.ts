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

/** The share of the way each Card behind has gone from `rest` to the swiped Card. */
export async function shares(page: Page, rest: { u: number; v: number }[]) {
	const now = await anchors(page);
	const lead = now.at(-1);
	if (!lead) throw new Error("Missing the swiped Card");
	return now.slice(0, -1).map((card, index) => {
		const slot = rest[index];
		if (!slot) throw new Error("Missing a slot");
		const to = { u: lead.u - slot.u, v: lead.v - slot.v };
		return (
			((card.u - slot.u) * to.u + (card.v - slot.v) * to.v) /
			(to.u * to.u + to.v * to.v)
		);
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
