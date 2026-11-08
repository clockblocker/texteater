/// <reference lib="dom" />
import type { Locator, Page } from "@playwright/test";
import { frame, inspector } from "./deck-interactions";

/**
 * Taps and frame sampling for the Deck interactions spec's tap checks: a
 * Card's box in logical px (u from the frame's inline-start edge), its
 * stacking and its opacity, every frame.
 */

/** One Card in one frame: its drawn box's middle and size, logical px. */
export type Shown = {
	readonly id: string;
	readonly u: number;
	readonly v: number;
	readonly w: number;
	readonly h: number;
	readonly z: number;
	readonly o: number;
};

/** One frame: when it drew (ms) and every Card, back to front as the DOM has them. */
export type Sample = { readonly t: number; readonly cards: readonly Shown[] };

/** Sets one of the variant's choice knobs in the inspector. */
export async function choose(page: Page, label: string, option: string) {
	await inspector(page)
		.getByRole("group", { name: label })
		.getByRole("button", { name: option, exact: true })
		.click();
}

/** Every Card as it shows now, back to front. */
export function shown(page: Page): Promise<Shown[]> {
	return frame(page).evaluate((deck) => {
		const box = deck.getBoundingClientRect();
		const rtl = getComputedStyle(deck).direction === "rtl";
		return [...deck.querySelectorAll("[data-card-id]")].map((element) => {
			const own = element.getBoundingClientRect();
			const style = getComputedStyle(element);
			const middle = own.left + own.width / 2;
			return {
				id: element.getAttribute("data-card-id") ?? "",
				u: rtl ? box.right - middle : middle - box.left,
				v: own.top + own.height / 2 - box.top,
				w: own.width,
				h: own.height,
				z: Number(style.zIndex),
				o: Number(style.opacity),
			};
		});
	});
}

/**
 * From the next press on, every frame for `ms`: each Card as `shown`
 * reads it. Resolves to the frames once they are in. A frame is read
 * after every `requestAnimationFrame` callback of that frame, as the
 * tabletop frame log reads it (`frames.ts`): a ResizeObserver on a probe
 * whose size each frame toggles fires after them and after layout, just
 * before paint. Read in a callback of its own, a frame could come before
 * Motion's and show the Cards as the frame before left them, then a
 * double step: a jump that never painted.
 */
export async function record(page: Page, ms: number) {
	await frame(page).evaluate((deck, duration) => {
		const box = deck.getBoundingClientRect();
		const rtl = getComputedStyle(deck).direction === "rtl";
		const samples: Sample[] = [];
		let until = 0;
		let stamp = 0;
		const probe = document.createElement("div");
		probe.style.cssText =
			"position:fixed;left:0;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
		document.body.append(probe);
		const observer = new ResizeObserver(() => {
			if (stamp === 0) return;
			samples.push({
				t: stamp,
				cards: [...deck.querySelectorAll("[data-card-id]")].map(
					(element) => {
						const own = element.getBoundingClientRect();
						const style = getComputedStyle(element);
						const middle = own.left + own.width / 2;
						return {
							id: element.getAttribute("data-card-id") ?? "",
							u: rtl ? box.right - middle : middle - box.left,
							v: own.top + own.height / 2 - box.top,
							w: own.width,
							h: own.height,
							z: Number(style.zIndex),
							o: Number(style.opacity),
						};
					},
				),
			});
		});
		observer.observe(probe);
		let wide = false;
		const tick = (t: number) => {
			stamp = t;
			wide = !wide;
			probe.style.width = wide ? "2px" : "1px";
			if (t < until) requestAnimationFrame(tick);
			else
				requestAnimationFrame(() => {
					observer.disconnect();
					probe.remove();
				});
		};
		window.addEventListener(
			"pointerdown",
			() => {
				until = performance.now() + duration;
				requestAnimationFrame(tick);
			},
			{ capture: true, once: true },
		);
		Object.assign(window, { tapFrames: samples });
	}, ms);
	return async () => {
		await page.waitForTimeout(ms + 150);
		return page.evaluate(
			() => (window as unknown as { tapFrames: Sample[] }).tapFrames,
		);
	};
}

/** Where a tap on `card` lands: near its top, `across` of the way along its showing strip (its middle by default). */
export async function tailOf(card: Locator, across = 0.5) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	return { x: box.x + box.width * across, y: box.y + 20 };
}

/** Presses and lets go at `at`, with no move between. */
export async function tapAt(page: Page, at: { x: number; y: number }) {
	await page.mouse.move(at.x, at.y);
	await page.mouse.down();
	await page.mouse.up();
}

/** One Card's box in every frame. */
export function trackOf(samples: readonly Sample[], id: string) {
	return samples.map((sample) => {
		const card = sample.cards.find((own) => own.id === id);
		if (!card) throw new Error(`Card ${id} missing from a frame`);
		return { t: sample.t, ...card };
	});
}

/** The ids back to front, by stacking: the paint order. */
export function stackingOf(cards: readonly Shown[]): string[] {
	return cards
		.map((card, index) => ({ card, index }))
		.sort((a, b) => a.card.z - b.card.z || a.index - b.index)
		.map(({ card }) => card.id);
}

/**
 * The most any Card's box moved in one frame beyond what its own path
 * allows: 3 × the longest stretch of its path over a 200 ms cubicInOut
 * leg's length (its peak speed) for that frame's time, slowed by
 * `timeScale`, plus 1 px. A step and a stretch are read alike: the most
 * its middle, its width or its height moved. Above 0, a Card jumped.
 */
export function worstJump(samples: readonly Sample[], timeScale: number) {
	const first = samples[0];
	if (!first) return 0;
	let worst = 0;
	for (const { id } of first.cards) {
		const track = trackOf(samples, id);
		let reach = 0;
		for (const a of track)
			for (const b of track)
				reach = Math.max(
					reach,
					Math.hypot(a.u - b.u, a.v - b.v),
					Math.abs(a.w - b.w),
					Math.abs(a.h - b.h),
				);
		const peak = (3 * reach) / (200 / timeScale);
		for (let i = 1; i < track.length; i++) {
			const a = track[i - 1];
			const b = track[i];
			if (!a || !b) continue;
			const step = Math.max(
				Math.hypot(b.u - a.u, b.v - a.v),
				Math.abs(b.w - a.w),
				Math.abs(b.h - a.h),
			);
			worst = Math.max(worst, step - peak * (b.t - a.t) * 1.1 - 1);
		}
	}
	return worst;
}

/** How far `card` sits from `to`: the most its middle or its size is off, px. */
export function offBy(card: Shown, to: Shown) {
	return Math.max(
		Math.hypot(card.u - to.u, card.v - to.v),
		Math.abs(card.w - to.w),
		Math.abs(card.h - to.h),
	);
}

/**
 * Whether every Card is where Card `order[i]` rests in `rest` (the pile
 * before, back to front), to 0.01 px: the DOM in that order and the
 * stacking too.
 */
export function restsAs(
	cards: readonly Shown[],
	rest: readonly Shown[],
	order: readonly string[],
) {
	const off = Math.max(
		...order.map((id, index) => {
			const card = cards.find((own) => own.id === id);
			const slot = rest[index];
			return card && slot ? offBy(card, slot) : Number.POSITIVE_INFINITY;
		}),
	);
	return {
		off,
		dom: cards.map((card) => card.id),
		stacking: stackingOf(cards),
	};
}

/**
 * From the frame every Card first shows as it does in the last one: that
 * frame's index, the most any later frame strays from it, and its stacking.
 */
export function landing(samples: readonly Sample[]) {
	const last = samples.at(-1);
	if (!last) throw new Error("Nothing sampled");
	const still = (sample: Sample) =>
		last.cards.every((card) => {
			const then = sample.cards.find((own) => own.id === card.id);
			return then !== undefined && offBy(then, card) <= 0.01;
		});
	let at = samples.length - 1;
	while (at > 0 && still(samples[at - 1] as Sample)) at -= 1;
	const landed = samples[at] as Sample;
	return {
		at,
		stacking: stackingOf(landed.cards),
		drift: Math.max(
			...samples.slice(at).flatMap((sample) =>
				sample.cards.map((card) => {
					const then = landed.cards.find((own) => own.id === card.id);
					return then ? offBy(card, then) : Number.POSITIVE_INFINITY;
				}),
			),
		),
	};
}

/** The first frame in which Card `id` is stacked over every other. */
export function topFrom(samples: readonly Sample[], id: string) {
	return samples.findIndex((sample) => onTop(sample, id));
}

function onTop(sample: Sample, id: string) {
	const own = sample.cards.find((card) => card.id === id);
	return (
		own !== undefined &&
		sample.cards.every((card) => card.id === id || card.z < own.z)
	);
}

/** Whether Card `id` is above every other Card in each frame from `from` on. */
export function onTopFrom(
	samples: readonly Sample[],
	id: string,
	from: number,
) {
	return samples.slice(from).every((sample) => onTop(sample, id));
}

/**
 * The tapped Card's path, from its first frame: how far toward inline-end
 * it went, the frame it went furthest in, whether it only went out and
 * then only came back, and the first frame its height moved.
 */
export function pathOf(samples: readonly Sample[], id: string) {
	const track = trackOf(samples, id);
	const start = track[0];
	if (!start) throw new Error("Nothing sampled");
	const out = track.map((card) => card.u - start.u);
	const peak = Math.max(...out);
	const peakAt = out.indexOf(peak);
	const outThenIn = out.every((value, index) => {
		const before = out[index - 1];
		if (before === undefined) return true;
		return index <= peakAt
			? value >= before - 0.01
			: value <= before + 0.01;
	});
	return {
		out,
		peak,
		peakAt,
		outThenIn,
		least: Math.min(...out),
		dropsFrom: track.findIndex((card) => Math.abs(card.v - start.v) > 0.01),
	};
}

/** The first frame in which Card `id` moved from its first frame, or -1. */
export function movesFrom(samples: readonly Sample[], id: string) {
	const track = trackOf(samples, id);
	const start = track[0];
	if (!start) return -1;
	return track.findIndex((card) => offBy(card, start) > 0.01);
}

/** The first frame in which Card `id`'s stacking differs from its first. */
export function restacksFrom(samples: readonly Sample[], id: string) {
	const track = trackOf(samples, id);
	return track.findIndex((card) => card.z !== track[0]?.z);
}
