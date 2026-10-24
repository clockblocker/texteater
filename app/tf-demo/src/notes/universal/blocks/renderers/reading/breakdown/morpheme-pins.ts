import { useCallback, useSyncExternalStore } from "react";

/**
 * Which morpheme a click pinned on each morphemes line, by the line's owner.
 * It lives outside the Note so a pin survives the Note unmounting when the
 * morpheme's Note opens, and shows again on the way back. It lasts for the
 * session only.
 */
const pins = new Map<string, number>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function setPin(owner: string, index: number | null) {
	if ((pins.get(owner) ?? null) === index) return;
	if (index === null) pins.delete(owner);
	else pins.set(owner, index);
	for (const listener of listeners) listener();
}

export function useMorphemePin(
	owner: string,
): readonly [number | null, (index: number | null) => void] {
	const pinned = useSyncExternalStore(
		subscribe,
		() => pins.get(owner) ?? null,
		() => null,
	);
	const set = useCallback(
		(index: number | null) => setPin(owner, index),
		[owner],
	);
	return [pinned, set];
}
