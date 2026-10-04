import type { Orientation } from "./types";

/**
 * Orders SplitRegions and SplitHandles as they sit along the Split's axis,
 * from inline-start (or the top) to inline-end (or the bottom). Under
 * `dir="rtl"` a horizontal Split's inline-start is its right edge.
 */
export function sortByElementOffset<
	Type extends { element: HTMLElement },
	ReturnType extends Type[],
>(
	orientation: Orientation,
	regionsOrHandles: Type[],
	rightToLeft: boolean,
): ReturnType {
	return Array.from(regionsOrHandles).sort(
		orientation === "vertical"
			? verticalSort
			: rightToLeft
				? rightToLeftSort
				: horizontalSort,
	) as ReturnType;
}

function horizontalSort<Type extends { element: HTMLElement }>(
	a: Type,
	b: Type,
) {
	const delta = a.element.offsetLeft - b.element.offsetLeft;
	if (delta !== 0) {
		return delta;
	}
	return a.element.offsetWidth - b.element.offsetWidth;
}

function rightToLeftSort<Type extends { element: HTMLElement }>(
	a: Type,
	b: Type,
) {
	const delta =
		b.element.offsetLeft +
		b.element.offsetWidth -
		(a.element.offsetLeft + a.element.offsetWidth);
	if (delta !== 0) {
		return delta;
	}
	return a.element.offsetWidth - b.element.offsetWidth;
}

function verticalSort<Type extends { element: HTMLElement }>(a: Type, b: Type) {
	const delta = a.element.offsetTop - b.element.offsetTop;
	if (delta !== 0) {
		return delta;
	}
	return a.element.offsetHeight - b.element.offsetHeight;
}
