import type { WritingDirection } from "compass";

/**
 * The renderer's side of the geometry: what reads the page. Where things
 * sit is the battery's workspace geometry, which takes what is read here
 * as arguments; the root size is read by `remPx` in the Presentation
 * foundation.
 */

/** The writing direction an element lays out in. */
export function directionOf(element: Element): WritingDirection {
	return getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}

/** The viewport's width, in px, as the `md` breakpoint reads it. */
export function viewportWidth(): number {
	return document.documentElement.clientWidth;
}
