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

/**
 * D's swipe panel in one frame: the part of its box it paints, cut by its
 * clip-path, in a Card's terms; whose it is; its opacity times the Deck
 * layer's; its colour fill's opacity, and whether it is armed.
 */
export type PanelShown = Omit<Shown, "id"> & {
	readonly card: string;
	readonly fill: number;
	readonly armed: boolean;
};

/**
 * One frame: when it drew (ms), every Card, back to front as the DOM has
 * them, D's swipe panel if one is mounted, how many presses had come by
 * then and whether the hand was down.
 */
export type Sample = {
	readonly t: number;
	readonly cards: readonly Shown[];
	readonly panel: PanelShown | null;
	readonly presses: number;
	readonly down: boolean;
};

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
 * reads it, and D's swipe panel. Resolves to the frames once the last is
 * in. A frame is read after every `requestAnimationFrame` callback of that
 * frame, as the
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
		let presses = 0;
		let down = false;
		const probe = document.createElement("div");
		probe.style.cssText =
			"position:fixed;left:0;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
		document.body.append(probe);
		/* a clip-path inset, top right bottom left, in the element's own px */
		const insetOf = (clip: string) => {
			const found = /^inset\(([^)]*)\)/.exec(clip);
			const [t = 0, r = t, b = t, l = r] = (found?.[1] ?? "")
				.split(" round ")[0]
				?.trim()
				.split(/\s+/)
				.filter(Boolean)
				.map(Number.parseFloat) ?? [0];
			return { t, r, b, l };
		};
		const panelOf = (): PanelShown | null => {
			const element = deck.querySelector("[data-panel]");
			if (!element) return null;
			const style = getComputedStyle(element);
			const scale = new DOMMatrixReadOnly(style.transform).a;
			const cut = insetOf(style.clipPath);
			const own = element.getBoundingClientRect();
			const left = own.left + cut.l * scale;
			const right = own.right - cut.r * scale;
			const top = own.top + cut.t * scale;
			const bottom = own.bottom - cut.b * scale;
			const middle = (left + right) / 2;
			const layer = deck.querySelector("[data-deck-layer]");
			const fill = element.querySelector("[data-panel-fill]");
			return {
				card: element.getAttribute("data-panel-card") ?? "",
				u: rtl ? box.right - middle : middle - box.left,
				v: (top + bottom) / 2 - box.top,
				w: Math.max(0, right - left),
				h: Math.max(0, bottom - top),
				z: Number(style.zIndex),
				o:
					Number(style.opacity) *
					(layer ? Number(getComputedStyle(layer).opacity) : 1),
				fill: fill ? Number(getComputedStyle(fill).opacity) : 0,
				armed: element.hasAttribute("data-armed"),
			};
		};
		const press = () => {
			presses += 1;
			down = true;
		};
		const lift = () => {
			down = false;
		};
		window.addEventListener("pointerdown", press, { capture: true });
		window.addEventListener("pointerup", lift, { capture: true });
		const observer = new ResizeObserver(() => {
			if (stamp === 0) return;
			samples.push({
				t: stamp,
				panel: panelOf(),
				presses,
				down,
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
					window.removeEventListener("pointerdown", press, {
						capture: true,
					});
					window.removeEventListener("pointerup", lift, {
						capture: true,
					});
					Object.assign(window, { tapEnded: true });
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
		Object.assign(window, { tapFrames: samples, tapEnded: false });
	}, ms);
	return async () => {
		await page.waitForFunction(
			() => (window as unknown as { tapEnded: boolean }).tapEnded,
		);
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

/** Whether Card `id` is stacked over every other in `sample`. */
export function onTop(sample: Sample, id: string) {
	const own = sample.cards.find((card) => card.id === id);
	return (
		own !== undefined &&
		sample.cards.every((card) => card.id === id || card.z < own.z)
	);
}

/** The first frame in which Card `id` moved from its first frame, or -1. */
export function movesFrom(samples: readonly Sample[], id: string) {
	const track = trackOf(samples, id);
	const start = track[0];
	if (!start) return -1;
	return track.findIndex((card) => offBy(card, start) > 0.01);
}

/** The open Card's resting scale, the app's `OPEN_SCALE`. */
const OPEN_SCALE = 1.05;

/**
 * The stacking tf-demo's `deckSlots` gives slot `index` while the Card at
 * `openAt` is open: rising toward it from both sides, one step per slot,
 * the open Card over all of them.
 */
export function zOf(index: number, openAt: number) {
	return 10 + Math.max(0, 9 - Math.abs(index - openAt));
}

/**
 * Every Card where it rests with the Card at `openAt` open, read from
 * `dealt`, the pile as dealt (back to front, its last Card open): each in
 * its own slot, its drawn top edge and its middle along the inline axis
 * where they were, only the open Card at the open scale, stacked by
 * `zOf`, solid.
 */
export function restingAs(dealt: readonly Shown[], openAt: number): Shown[] {
	const dealtAt = dealt.length - 1;
	return dealt.map((own, index) => {
		const was = index === dealtAt ? OPEN_SCALE : 1;
		const now = index === openAt ? OPEN_SCALE : 1;
		const w = (own.w / was) * now;
		/* an open Card with Cards below it is trimmed to its slot's height,
		   drawn: the Tail under it shows a whole Heading row */
		const trimmed = index === openAt && openAt < dealtAt;
		const h = trimmed ? own.h / was : (own.h / was) * now;
		const top = own.v - own.h / 2;
		return { ...own, w, h, v: top + h / 2, z: zOf(index, openAt), o: 1 };
	});
}

/**
 * The most `cards` are off `rest` (both back to front, as the DOM has
 * them): their ids in that order, the most a box is off in px, and
 * whether every stacking and opacity is the same.
 */
export function offRest(cards: readonly Shown[], rest: readonly Shown[]) {
	return {
		dom: cards.map((card) => card.id),
		off: Math.max(
			...rest.map((slot) => {
				const card = cards.find((own) => own.id === slot.id);
				return card ? offBy(card, slot) : Number.POSITIVE_INFINITY;
			}),
		),
		stacked: rest.every(
			(slot) =>
				cards.find((own) => own.id === slot.id)?.z === slot.z &&
				cards.find((own) => own.id === slot.id)?.o === slot.o,
		),
	};
}

/**
 * Where a tap on `card` lands in the strip of it that shows: near its top
 * when it is folded above the open Card or is it, near its foot when it
 * is folded below it, as tf-demo marks it (`data-place`).
 */
export async function stripOf(card: Locator) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const below = (await card.getAttribute("data-place")) === "below";
	return {
		x: box.x + box.width / 2,
		y: below ? box.y + box.height - 16 : box.y + 20,
	};
}
