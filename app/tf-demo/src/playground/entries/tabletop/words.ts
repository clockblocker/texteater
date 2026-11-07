/**
 * The dummy Note Cards the Tabletop entry deals: a title, a caption, a
 * gloss and Source contexts, as a Note shows them. Nothing here reads the
 * fake db; only the physical layer is under study.
 */
export type NoteCard = {
	readonly id: string;
	readonly title: string;
	/** The Caption: what kind of thing the title is. */
	readonly caption: string;
	/** Luna's emoji for it, once its Knowledge has landed. */
	readonly emoji?: string;
	readonly gloss: string;
	/** The Source contexts: the first shows on the Card, the rest on the Cover. */
	readonly contexts: readonly string[];
	/** Lines only the Cover shows. */
	readonly lines: readonly string[];
};

export const NOTE_CARDS: readonly NoteCard[] = [
	{
		id: "gehen",
		title: "gehen",
		caption: "verb",
		gloss: "to go, to walk",
		contexts: [
			"Wir gehen jeden Morgen zur Schule.",
			"Wie geht es dir?",
			"Er ging nach Hause, ohne ein Wort zu sagen.",
		],
		lines: ["ging · ist gegangen", "Unregelmäßiges Verb."],
	},
	{
		id: "haus",
		title: "das Haus",
		caption: "noun",
		gloss: "house, home",
		contexts: [
			"Das Haus am See steht seit Jahren leer.",
			"Komm gut nach Hause!",
		],
		lines: ["die Häuser", "Neutrum."],
	},
	{
		id: "schnell",
		title: "schnell",
		caption: "adjective",
		gloss: "fast, quick",
		contexts: [
			"Der Zug fährt schneller als das Auto.",
			"Sie hat schnell geantwortet.",
		],
		lines: ["schneller · am schnellsten"],
	},
	{
		id: "brief",
		title: "der Brief",
		caption: "noun",
		gloss: "letter",
		contexts: [
			"Der Brief kam drei Tage zu spät.",
			"Sie schreibt ihrer Großmutter einen Brief.",
		],
		lines: ["die Briefe", "Maskulinum."],
	},
	{
		id: "lesen",
		title: "lesen",
		caption: "verb",
		gloss: "to read",
		contexts: [
			"Ich lese jeden Abend ein Kapitel.",
			"Er hat den Brief zweimal gelesen.",
			"Liest du gern Krimis?",
		],
		lines: ["las · hat gelesen", "liest (2. und 3. Person)."],
	},
	{
		id: "fenster",
		title: "das Fenster",
		caption: "noun",
		gloss: "window",
		contexts: [
			"Mach bitte das Fenster zu, es zieht.",
			"Vom Fenster aus sieht man die Berge.",
		],
		lines: ["die Fenster", "Neutrum."],
	},
	{
		id: "vergessen",
		title: "vergessen",
		caption: "verb",
		gloss: "to forget",
		contexts: [
			"Ich habe meinen Schlüssel vergessen.",
			"Vergiss nicht, die Blumen zu gießen!",
		],
		lines: ["vergaß · hat vergessen"],
	},
	{
		id: "abend",
		title: "der Abend",
		caption: "noun",
		gloss: "evening",
		contexts: [
			"Am Abend sitzen wir auf dem Balkon.",
			"Guten Abend, wie war die Reise?",
		],
		lines: ["die Abende", "Maskulinum."],
	},
];

export function noteCard(id: string): NoteCard | undefined {
	return NOTE_CARDS.find((card) => card.id === id);
}

/**
 * Words the inspector deals as if a reader clicked them in a text: the
 * form clicked, and the Note its Knowledge (Luna's emoji, base form and
 * gloss) turns out to be.
 */
export const WORDS_TO_DEAL: readonly {
	readonly surface: string;
	readonly card: NoteCard;
}[] = [
	{
		surface: "lief",
		card: {
			id: "laufen",
			title: "laufen",
			caption: "verb",
			emoji: "🏃",
			gloss: "to run, to walk",
			contexts: ["Sie lief jeden Morgen durch den Park."],
			lines: ["lief · ist gelaufen"],
		},
	},
	{
		surface: "Bücher",
		card: {
			id: "buch",
			title: "das Buch",
			caption: "noun",
			emoji: "📖",
			gloss: "book",
			contexts: ["Er hat zu viele Bücher im Regal."],
			lines: ["die Bücher", "Neutrum."],
		},
	},
	{
		surface: "schrieb",
		card: {
			id: "schreiben",
			title: "schreiben",
			caption: "verb",
			emoji: "✍️",
			gloss: "to write",
			contexts: ["Sie schrieb ihm einen langen Brief."],
			lines: ["schrieb · hat geschrieben"],
		},
	},
	{
		surface: "Städte",
		card: {
			id: "stadt",
			title: "die Stadt",
			caption: "noun",
			emoji: "🏙️",
			gloss: "town, city",
			contexts: ["Die Städte am Rhein sind alt."],
			lines: ["die Städte", "Femininum."],
		},
	},
	{
		surface: "wartete",
		card: {
			id: "warten",
			title: "warten",
			caption: "verb",
			emoji: "⏳",
			gloss: "to wait",
			contexts: ["Er wartete eine Stunde auf den Bus."],
			lines: ["wartete · hat gewartet"],
		},
	},
];
