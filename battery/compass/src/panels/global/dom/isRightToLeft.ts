/**
 * Whether an element runs its inline axis right to left, as under
 * `dir="rtl"`. A horizontal Split resizes along the inline axis, so its first
 * SplitRegion then sits on the right.
 */
export function isRightToLeft(element: HTMLElement): boolean {
	const view = element.ownerDocument.defaultView;
	return view?.getComputedStyle(element).direction === "rtl";
}
