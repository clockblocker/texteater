import { DUMMY_DECK, type DummyCard } from "../deck-interactions/words";

/**
 * A dummy Card and what only its Cover shows: the Card names its first
 * Source context; the Cover lists the rest after it.
 */
export type CoverCard = DummyCard & {
	readonly coverContexts: readonly string[];
};

/** Source contexts only a Cover has room for, by Card. */
const MORE: Readonly<Record<string, readonly string[]>> = {
	attestation: [
		"Dann ging das Licht im Flur aus.",
		"Niemand wusste, wohin er ging.",
	],
	surface: ["Ich ging früh schlafen.", "Es ging alles sehr schnell."],
	lemma: ["Das geht nicht.", "Lass uns nach draußen gehen."],
	reading: ["Wir gingen am Fluss entlang."],
};

export const COVER_DECK: readonly CoverCard[] = DUMMY_DECK.map((card) => ({
	...card,
	coverContexts: [...card.contexts.slice(1), ...(MORE[card.id] ?? [])],
}));

/** The most Cover-only parts any Card has: its × and its extra contexts. */
export const MAX_COVER_ONLY =
	1 + Math.max(...COVER_DECK.map((card) => card.coverContexts.length));

export function coverCardById(id: string): CoverCard | undefined {
	return COVER_DECK.find((card) => card.id === id);
}
