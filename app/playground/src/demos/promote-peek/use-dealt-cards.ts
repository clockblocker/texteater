import { useEffect, useMemo, useState } from "react";
import {
	type CardKind,
	type FakeCard,
	type FakeResolution,
	resolveWord,
} from "@/fixtures";
import type { Lookup } from "./state";

/** `useFakeResolution`'s default arrival times, in ms. */
const delaysMs: readonly number[] = [250, 700, 1300, 2100];

/**
 * Like `useFakeResolution`, but timed from the lookup's `startedAt`, not
 * from mount. A surface remounts at each level, and a Deck already dealt
 * must not deal again because it was pinned.
 */
export function useDealtCards(lookup: Lookup): {
	readonly resolution: FakeResolution;
	readonly cards: readonly FakeCard[];
	readonly pending: readonly CardKind[];
} {
	const resolution = useMemo(() => resolveWord(lookup.query), [lookup.query]);
	const [now, setNow] = useState(() => performance.now());
	const elapsed = now - lookup.startedAt;
	const count = Math.min(
		resolution.cards.length,
		delaysMs.filter((delay) => delay <= elapsed).length,
	);

	useEffect(() => {
		const delay = delaysMs[count];
		if (count >= resolution.cards.length || delay === undefined) return;
		const timer = setTimeout(
			() => setNow(performance.now()),
			Math.max(0, lookup.startedAt + delay - performance.now()),
		);
		return () => clearTimeout(timer);
	}, [count, lookup.startedAt, resolution]);

	return {
		resolution,
		cards: resolution.cards.slice(0, count),
		pending: resolution.cards.slice(count).map((card) => card.kind),
	};
}
