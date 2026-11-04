/**
 * The dummy Deck the interaction prototype deals: one click on "ging", four
 * Cards in the real Deck's order, the clicked form at the back and the
 * meaning in front. Nothing here reads the fake db; only the gesture is
 * under study.
 */
export type DummyCard = {
	readonly id: string;
	readonly title: string;
	/** The Caption: how this Card's Subject leads to the next one dealt. */
	readonly caption: string;
	readonly contexts: readonly string[];
	readonly lines: readonly string[];
};

export const DUMMY_DECK: readonly DummyCard[] = [
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

export function cardById(id: string): DummyCard | undefined {
	return DUMMY_DECK.find((card) => card.id === id);
}
