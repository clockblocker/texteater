/**
 * The body's font size in px. The modules scale their pixel layouts by it
 * over 16, as the card box scales with the rem.
 */
export function getFontSize(): number {
	return Number(
		window
			.getComputedStyle(document.body)
			.getPropertyValue("font-size")
			.slice(0, -2),
	);
}
