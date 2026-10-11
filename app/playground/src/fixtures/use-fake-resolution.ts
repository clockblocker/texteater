import { useEffect, useMemo, useState } from "react";
import {
	type CardKind,
	type FakeCard,
	type FakeResolution,
	resolveWord,
} from "./resolution";
import type { FixtureWord } from "./text";

/** When each Card arrives, in ms after the word is set, in deal order. */
const defaultDelaysMs: readonly number[] = [250, 700, 1300, 2100];

export type FakeResolutionState = {
	/** The whole resolution, every Card included, or null with no word. */
	readonly resolution: FakeResolution | null;
	/** The Cards that have arrived, in deal order. */
	readonly cards: readonly FakeCard[];
	/** The kinds still on their way, in deal order. */
	readonly pending: readonly CardKind[];
	readonly done: boolean;
};

/**
 * Resolves `word` and reveals its Cards one by one, as a pipeline would.
 * A new word starts over; null clears. The delays are data, not motion,
 * so the reduced-motion toggle leaves them alone.
 */
export function useFakeResolution(
	word: FixtureWord | string | null,
	delaysMs: readonly number[] = defaultDelaysMs,
): FakeResolutionState {
	const key =
		word === null ? null : typeof word === "string" ? word : word.id;
	// Keyed on the word's id: a new object for the same word is no new lookup.
	const resolution = useMemo(
		() => (word === null ? null : resolveWord(word)),
		[key],
	);
	const [arrived, setArrived] = useState({ key, count: 0 });
	const count = arrived.key === key ? arrived.count : 0;

	useEffect(() => {
		setArrived({ key, count: 0 });
		if (resolution === null) return;
		const timers = resolution.cards.map((_, index) =>
			setTimeout(
				() => setArrived({ key, count: index + 1 }),
				delaysMs[index] ?? delaysMs.at(-1) ?? 0,
			),
		);
		return () => {
			for (const timer of timers) clearTimeout(timer);
		};
	}, [resolution]);

	const cards = resolution?.cards.slice(0, count) ?? [];
	return {
		resolution,
		cards,
		pending: resolution?.cards.slice(count).map((card) => card.kind) ?? [],
		done: resolution !== null && count >= resolution.cards.length,
	};
}
