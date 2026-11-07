/// <reference lib="dom" />
import type { Page } from "@playwright/test";

/**
 * Where two resting Bodies overlap, which one the page draws on top,
 * against the order their Places give them (`--rest-z`, later seats on top
 * among equals): every pair that disagrees. It hit-tests points inside
 * both, so it reads what the reader sees, veils and all.
 */
export function stackingOffModel(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const bodies = [
			...document.querySelectorAll<HTMLElement>("[data-tabletop-body]"),
		];
		const seats = [
			...document.querySelectorAll<HTMLElement>("[data-tabletop-seat]"),
		];
		const rank = (el: HTMLElement) => {
			const seat = el.closest<HTMLElement>("[data-tabletop-seat]");
			return {
				z: Number(seat?.style.getPropertyValue("--rest-z")) || 0,
				order: seat ? seats.indexOf(seat) : -1,
			};
		};
		/* the one the model puts on top */
		const modelled = (a: HTMLElement, b: HTMLElement) => {
			const [x, y] = [rank(a), rank(b)];
			if (x.z !== y.z) return x.z > y.z ? a : b;
			return x.order > y.order ? a : b;
		};
		/* the one the page draws on top, at a point inside both, if any */
		const drawn = (a: HTMLElement, b: HTMLElement) => {
			const ra = a.getBoundingClientRect();
			const rb = b.getBoundingClientRect();
			const left = Math.max(ra.left, rb.left);
			const right = Math.min(ra.right, rb.right);
			const top = Math.max(ra.top, rb.top);
			const bottom = Math.min(ra.bottom, rb.bottom);
			if (right - left < 4 || bottom - top < 4) return null;
			/* a few points across the overlap, for rotated Cards */
			for (const [u, v] of [
				[0.5, 0.5],
				[0.25, 0.25],
				[0.75, 0.75],
				[0.25, 0.75],
				[0.75, 0.25],
			] as const) {
				const hits = document.elementsFromPoint(
					left + (right - left) * u,
					top + (bottom - top) * v,
				);
				const inA = hits.findIndex((hit) => a.contains(hit));
				const inB = hits.findIndex((hit) => b.contains(hit));
				if (inA >= 0 && inB >= 0) return inA < inB ? a : b;
			}
			return null;
		};
		const off: string[] = [];
		bodies.forEach((a, i) => {
			for (const b of bodies.slice(i + 1)) {
				const shown = drawn(a, b);
				const model = modelled(a, b);
				if (shown && shown !== model)
					off.push(
						`${shown.dataset.tabletopBody} drawn over ${model.dataset.tabletopBody}`,
					);
			}
		});
		return off;
	});
}
