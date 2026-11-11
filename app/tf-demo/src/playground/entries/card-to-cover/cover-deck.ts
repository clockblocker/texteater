/**
 * The dummy Deck the Card-to-Cover prototype grows: one click on "ging",
 * four Cards in the real Deck's order, the clicked form at the back and
 * the meaning in front. Nothing here reads the fake db: the prototype
 * studies how a box and its parts move, on a face of its own.
 */
type DummyCard = {
	readonly id: string;
	readonly title: string;
	/** The Caption: how this Card's Subject leads to the next one dealt. */
	readonly caption: string;
	readonly contexts: readonly string[];
	readonly lines: readonly string[];
};

const DECK: readonly DummyCard[] = [
	{
		id: "attestation",
		title: "ging",
		caption: "as written",
		contexts: ["Er ging nach Hause, ohne ein Wort zu sagen."],
		lines: ["Satz 3 in „Der Brief“."],
	},
	{
		id: "surface",
		title: "ging",
		caption: "past of",
		contexts: ["Sie ging langsam die Treppe hinauf."],
		lines: ["Präteritum, 1. und 3. Person Singular."],
	},
	{
		id: "lemma",
		title: "gehen",
		caption: "verb",
		contexts: ["Wir gehen jeden Morgen zur Schule.", "Wie geht es dir?"],
		lines: ["ging · ist gegangen", "Unregelmäßiges Verb."],
	},
	{
		id: "reading",
		title: "go, walk",
		caption: "meaning",
		contexts: [
			"Er ging nach Hause, ohne ein Wort zu sagen.",
			"Sie ging langsam die Treppe hinauf.",
		],
		lines: [
			"To move on foot from one place to another.",
			"Der Rest ist Füllung mit Absicht.",
			"Nichts hier ist echt, aber alles hat die richtige Größe.",
			"Wer bis hierher liest, prüft die Lauflänge einer Karte.",
		],
	},
];

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

export const COVER_DECK: readonly CoverCard[] = DECK.map((card) => ({
	...card,
	coverContexts: [...card.contexts.slice(1), ...(MORE[card.id] ?? [])],
}));

/** The most Cover-only parts any Card has: its × and its extra contexts. */
export const MAX_COVER_ONLY =
	1 + Math.max(...COVER_DECK.map((card) => card.coverContexts.length));

export function coverCardById(id: string): CoverCard | undefined {
	return COVER_DECK.find((card) => card.id === id);
}
