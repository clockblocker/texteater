export function nextCardDemoFocusIndex(
	currentIndex: number,
	itemCount: number,
	reverse: boolean,
): number | null {
	if (itemCount <= 0) return null;
	if (currentIndex < 0 || currentIndex >= itemCount) {
		return reverse ? itemCount - 1 : 0;
	}
	return reverse
		? (currentIndex - 1 + itemCount) % itemCount
		: (currentIndex + 1) % itemCount;
}
