/// <reference lib="dom" />
import type { Page } from "@playwright/test";

/**
 * A frame log of every tabletop Body, read once a frame after the Table has
 * written it and after layout, just before paint: a ResizeObserver on a
 * probe whose size the log toggles in each animation frame fires then, after
 * every `requestAnimationFrame` callback of that frame. What a frame records
 * is what the reader saw. Shared by the tabletop, Deck tricks and later
 * migrations' specs (#1319, #1320).
 */

export type Rect = {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
};

/** One Part, or a copy of one, in a Body's shown face. */
type PartFrame = {
	readonly id: string;
	/**
	 * px in its face, before the Body's own transforms (so a turning or
	 * leaning Body doesn't skew it), its own translation included, clipped
	 * to the face; `null` once wholly clipped.
	 */
	readonly rect: Rect | null;
	/** Its own opacity times every ancestor's up to the Body. */
	readonly opacity: number;
	readonly text: boolean;
};

export type BodyFrame = {
	readonly id: string;
	/** Where its centre is drawn, client px, before a lean. */
	readonly cx: number;
	readonly cy: number;
	/** Its drawn size before rotation and lean: its own size times its scale. */
	readonly w: number;
	readonly h: number;
	/** Its bounding box on screen, every transform included, the lean too. */
	readonly bounds: Rect;
	/** Its own size before any transform: what a resize changes. */
	readonly size: { readonly w: number; readonly h: number };
	/** Physical degrees and its scale; its lean out of the screen's plane in degrees. */
	readonly rotate: number;
	readonly scale: number;
	readonly lean: number;
	readonly opacity: number;
	/** Its seat's stacking order as drawn, and the order its Place gives it. */
	readonly z: number;
	readonly restZ: number;
	/** Its seat's place among the seats, for ties. */
	readonly order: number;
	readonly form: string;
	readonly side: string;
	readonly mode: string;
	readonly slot: string;
	/** How much it shows over each Body it is crossing (it is drawn above them), by that Body's id. */
	readonly veils: Readonly<Record<string, number>>;
	readonly parts: readonly PartFrame[];
};

export type Frame = {
	/** The frame's own timestamp, ms. */
	readonly t: number;
	readonly bodies: Readonly<Record<string, BodyFrame>>;
};

type Options = {
	/** Only these Bodies; every Body by default. */
	readonly ids?: readonly string[];
	/** Whether to read each Body's Parts. */
	readonly parts?: boolean;
	/** Stop after this many frames. */
	readonly max?: number;
};

type LogWindow = { __frames?: Frame[]; __frameLogStop?: () => void };

/** Starts logging every frame; `stopFrameLog` returns what it saw. */
export async function startFrameLog(page: Page, options: Options = {}) {
	await page.evaluate(
		({ ids, parts, max }) => {
			const w = window as unknown as LogWindow;
			w.__frameLogStop?.();
			const frames: Frame[] = [];
			w.__frames = frames;
			const round = (v: number) => Math.round(v * 100) / 100;
			const pair = (value: string) =>
				(value === "none" ? "0px 0px" : value)
					.split(" ")
					.map((v) => Number.parseFloat(v) || 0);
			const leanOf = (transform: string) => {
				const m = /matrix3d\(([^)]*)\)/.exec(transform);
				if (!m?.[1]) return 0;
				const v = m[1].split(",").map(Number);
				const scale = Math.hypot(v[0] ?? 1, v[1] ?? 0, v[2] ?? 0) || 1;
				const sin = Math.max(
					...[v[2], v[6], v[8], v[9]].map((x) => Math.abs(x ?? 0)),
				);
				return round(
					(Math.asin(Math.min(1, sin / scale)) * 180) / Math.PI,
				);
			};
			const opacityUpTo = (el: Element, root: Element) => {
				let o = 1;
				for (let at: Element | null = el; at; at = at.parentElement) {
					o *= Number(getComputedStyle(at).opacity);
					if (at === root) break;
				}
				return round(o);
			};
			const veilsOf = (id: string) => {
				const out: Record<string, number> = {};
				for (const shape of document.querySelectorAll<SVGElement>(
					`[data-tabletop-veil="${CSS.escape(id)}"] [data-over]`,
				))
					out[shape.dataset.over ?? "?"] = round(
						1 - Number(shape.getAttribute("fill-opacity") ?? 1),
					);
				return out;
			};
			/* a Part's box in its face: offsets from the face, which every
			   Part hangs from, plus its own translation */
			const partOf = (
				part: HTMLElement,
				face: HTMLElement,
				root: HTMLElement,
				index: number,
			) => {
				let x = 0;
				let y = 0;
				for (
					let at: HTMLElement | null = part;
					at && at !== face;
					at = at.offsetParent as HTMLElement | null
				) {
					x += at.offsetLeft;
					y += at.offsetTop;
				}
				const [tx = 0, ty = 0] = pair(getComputedStyle(part).translate);
				x += tx;
				y += ty;
				const right = Math.min(face.clientWidth, x + part.offsetWidth);
				const bottom = Math.min(
					face.clientHeight,
					y + part.offsetHeight,
				);
				const left = Math.max(0, x);
				const top = Math.max(0, y);
				return {
					id: part.dataset.tabletopPart ?? `copy-${index}`,
					rect:
						right - left > 0 && bottom - top > 0
							? {
									x: round(left),
									y: round(top),
									w: round(right - left),
									h: round(bottom - top),
								}
							: null,
					opacity: opacityUpTo(part, root),
					text: (part.textContent ?? "").trim() !== "",
				};
			};
			const read = (el: HTMLElement, seats: HTMLElement[]): BodyFrame => {
				const id = el.dataset.tabletopBody ?? "?";
				const seat = el.closest<HTMLElement>("[data-tabletop-seat]");
				const style = getComputedStyle(el);
				const shell = el.querySelector<HTMLElement>(
					"[data-tabletop-shell]",
				);
				const side = shell?.dataset.side ?? "front";
				const face = shell?.querySelector<HTMLElement>(
					`:scope > [data-tabletop-face="${side}"]`,
				);
				const at = (seat ?? el).getBoundingClientRect();
				const [tx = 0, ty = 0] = pair(style.translate);
				const scale =
					style.scale === "none"
						? 1
						: Number(style.scale.split(" ")[0]);
				const b = el.getBoundingClientRect();
				return {
					id,
					cx: round(
						at.left + el.offsetLeft + tx + el.offsetWidth / 2,
					),
					cy: round(at.top + el.offsetTop + ty + el.offsetHeight / 2),
					w: round(el.offsetWidth * scale),
					h: round(el.offsetHeight * scale),
					bounds: {
						x: round(b.left),
						y: round(b.top),
						w: round(b.width),
						h: round(b.height),
					},
					size: { w: el.offsetWidth, h: el.offsetHeight },
					rotate: round(Number.parseFloat(style.rotate) || 0),
					scale,
					lean: leanOf(style.transform),
					opacity: round(Number(style.opacity)),
					z: Number(seat ? getComputedStyle(seat).zIndex : 0) || 0,
					restZ:
						Number(seat?.style.getPropertyValue("--rest-z")) || 0,
					order: seat ? seats.indexOf(seat) : -1,
					form: el.dataset.form ?? "",
					side,
					mode: el.dataset.mode ?? "rest",
					slot: el.dataset.slot ?? "",
					veils: veilsOf(id),
					parts:
						parts && face
							? [
									...face.querySelectorAll<HTMLElement>(
										"[data-tabletop-part],[data-tabletop-ghost]",
									),
								].map((part, index) =>
									partOf(part, face, el, index),
								)
							: [],
				};
			};
			const probe = document.createElement("div");
			probe.style.cssText =
				"position:fixed;left:0;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none";
			document.body.append(probe);
			let on = true;
			let stamp = 0;
			const observer = new ResizeObserver(() => {
				if (!on) return;
				const seats = [
					...document.querySelectorAll<HTMLElement>(
						"[data-tabletop-seat]",
					),
				];
				const bodies: Record<string, BodyFrame> = {};
				for (const el of document.querySelectorAll<HTMLElement>(
					"[data-tabletop-body]",
				)) {
					const id = el.dataset.tabletopBody ?? "?";
					if (!ids || ids.includes(id)) bodies[id] = read(el, seats);
				}
				frames.push({ t: round(stamp), bodies });
			});
			observer.observe(probe);
			let wide = false;
			const tick = (timestamp: number) => {
				if (!on) return;
				stamp = timestamp;
				wide = !wide;
				probe.style.width = wide ? "2px" : "1px";
				if (frames.length < max) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
			w.__frameLogStop = () => {
				on = false;
				observer.disconnect();
				probe.remove();
			};
		},
		{
			ids: options.ids ? [...options.ids] : null,
			parts: options.parts ?? true,
			max: options.max ?? 900,
		},
	);
}

export function stopFrameLog(page: Page): Promise<Frame[]> {
	return page.evaluate(() => {
		const w = window as unknown as LogWindow;
		w.__frameLogStop?.();
		return w.__frames ?? [];
	});
}
