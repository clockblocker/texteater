import {
	type FakeCard,
	type FakeResolution,
	type FixtureWord,
	resolveWord,
} from "@/fixtures";

/**
 * German definitions, so a link inside a Card or a preview leads somewhere
 * worth hovering. The shared fixtures define in English and know only the
 * reading text's words; previews need a chain of German entries three or
 * more levels deep: gehen → Fuß → Beins → Körperteile → …
 */

type LocalEntry = {
	readonly lemma: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly translations: readonly string[];
	readonly gloss: string;
	readonly lemmaNote: string;
	readonly definition: string;
	/** Lower-case form → [caption relation, Surface note]. */
	readonly forms: Readonly<Record<string, readonly [string, string]>>;
};

const nominative = ["form of", "Nominative singular."] as const;

const localEntries: readonly LocalEntry[] = [
	{
		lemma: "der Fuß",
		ipa: "fuːs",
		emoji: "🦶",
		translations: ["foot"],
		gloss: "a foot",
		lemmaNote: "Masculine noun; plural Füße.",
		definition: "Der untere Teil des Beins, auf dem man steht und geht.",
		forms: {
			fuß: ["dative of", "Dative singular, in „zu Fuß“."],
			füße: ["plural of", "Nominative plural."],
			füßen: ["plural of", "Dative plural."],
		},
	},
	{
		lemma: "das Bein",
		ipa: "baɪ̯n",
		emoji: "🦵",
		translations: ["leg"],
		gloss: "a leg",
		lemmaNote: "Neuter noun; plural Beine.",
		definition: "Einer der beiden Körperteile, auf denen ein Mensch steht.",
		forms: {
			beins: ["genitive of", "Genitive singular: des Beins."],
			bein: nominative,
			beine: ["plural of", "Nominative plural."],
		},
	},
	{
		lemma: "das Körperteil",
		ipa: "ˈkœʁpɐˌtaɪ̯l",
		emoji: "🫱",
		translations: ["body part"],
		gloss: "a part of the body",
		lemmaNote: "Neuter noun, Körper + Teil; plural Körperteile.",
		definition: "Ein Teil des Körpers, zum Beispiel Kopf, Arm oder Bein.",
		forms: {
			körperteile: [
				"plural of",
				"Genitive plural, after „einer der beiden“.",
			],
			körperteil: nominative,
		},
	},
	{
		lemma: "der Körper",
		ipa: "ˈkœʁpɐ",
		emoji: "🧍",
		translations: ["body"],
		gloss: "a body",
		lemmaNote: "Masculine noun; plural Körper.",
		definition: "Alles, was ein Mensch oder Tier ist, von Kopf bis Fuß.",
		forms: {
			körpers: ["genitive of", "Genitive singular: des Körpers."],
			körper: nominative,
		},
	},
	{
		lemma: "der Teil",
		ipa: "taɪ̯l",
		emoji: "🧩",
		translations: ["part"],
		gloss: "a part",
		lemmaNote: "Masculine noun; plural Teile.",
		definition: "Ein Stück von einem Ganzen.",
		forms: { teil: nominative, teile: ["plural of", "Nominative plural."] },
	},
	{
		lemma: "der Ort",
		ipa: "ɔʁt",
		emoji: "📍",
		translations: ["place"],
		gloss: "a place",
		lemmaNote: "Masculine noun; plural Orte.",
		definition: "Eine Stelle, an der etwas ist oder geschieht.",
		forms: { ort: ["singular of", "Singular; dative after „von einem“."] },
	},
	{
		lemma: "der Mensch",
		ipa: "mɛnʃ",
		emoji: "🧑",
		translations: ["human", "person"],
		gloss: "a human being",
		lemmaNote: "Masculine weak noun: des Menschen.",
		definition: "Ein Lebewesen, das denken und sprechen kann.",
		forms: {
			mensch: nominative,
			menschen: ["plural of", "Nominative plural."],
		},
	},
	{
		lemma: "der Sitz",
		ipa: "zɪts",
		emoji: "💺",
		translations: ["seat"],
		gloss: "a seat",
		lemmaNote: "Masculine noun; plural Sitze.",
		definition: "Ein Platz, auf dem man sitzen kann.",
		forms: { sitz: nominative },
	},
	{
		lemma: "die Person",
		ipa: "pɛʁˈzoːn",
		emoji: "👥",
		translations: ["person"],
		gloss: "a person",
		lemmaNote: "Feminine noun; plural Personen.",
		definition: "Ein einzelner Mensch.",
		forms: {
			personen: ["plural of", "Accusative plural, after „für mehrere“."],
		},
	},
	{
		lemma: "der Zug",
		ipa: "tsuːk",
		emoji: "🚆",
		translations: ["train"],
		gloss: "a train",
		lemmaNote: "Masculine noun; plural Züge.",
		definition: "Mehrere Wagen auf Schienen, die eine Lok zieht.",
		forms: { zug: nominative, züge: ["plural of", "Nominative plural."] },
	},
	{
		lemma: "die Schiene",
		ipa: "ˈʃiːnə",
		emoji: "🛤️",
		translations: ["rail", "track"],
		gloss: "a rail",
		lemmaNote: "Feminine noun; plural Schienen.",
		definition: "Eine lange Stange aus Stahl, auf der ein Zug fährt.",
		forms: { schienen: ["plural of", "Dative plural after „auf“."] },
	},
	{
		lemma: "die Einzelheit",
		ipa: "ˈaɪ̯nt͡sl̩haɪ̯t",
		emoji: "🔎",
		translations: ["detail"],
		gloss: "a detail",
		lemmaNote: "Feminine noun; plural Einzelheiten.",
		definition: "Ein kleiner Teil eines größeren Ganzen.",
		forms: {
			einzelheiten: ["plural of", "Dative plural after „mit vielen“."],
		},
	},
	{
		lemma: "beginnen",
		ipa: "bəˈɡɪnən",
		emoji: "🏁",
		translations: ["to begin"],
		gloss: "to begin",
		lemmaNote: "Strong verb: beginnt, begann, hat begonnen.",
		definition: "Etwas zum ersten Mal tun; den ersten Schritt machen.",
		forms: { beginnen: ["infinitive of", "Infinitive."] },
	},
	{
		lemma: "das Ereignis",
		ipa: "ɛɐ̯ˈʔaɪ̯knɪs",
		emoji: "🎉",
		translations: ["event"],
		gloss: "an event",
		lemmaNote: "Neuter noun; plural Ereignisse.",
		definition: "Etwas, das an einem Ort und zu einer Zeit geschieht.",
		forms: { ereignis: ["dative of", "Dative singular after „einem“."] },
	},
	{
		lemma: "stehen",
		ipa: "ˈʃteːən",
		emoji: "🧍",
		translations: ["to stand"],
		gloss: "to stand",
		lemmaNote: "Strong verb: steht, stand, hat gestanden.",
		definition: "Aufrecht auf den Füßen sein, ohne sich zu bewegen.",
		forms: {
			steht: ["present of", "Present, 3rd person singular."],
			stehen: ["infinitive of", "Infinitive."],
		},
	},
];

/** German definitions for the shared fixtures' Reading Cards. */
const readingDefinitions: Readonly<Record<string, string>> = {
	gehen: "Sich zu Fuß von einem Ort zu einem anderen bewegen.",
	"die Bank": "Ein langer Sitz für mehrere Personen, oft im Freien.",
	anfangen: "Zu einer bestimmten Zeit beginnen, von einem Ereignis gesagt.",
	zu: "Zeigt den Ort, zu dem sich jemand bewegt.",
	"der Bahnhof":
		"Ein Ort, an dem Züge halten und Menschen ein- und aussteigen.",
	detailliert: "Mit vielen Einzelheiten, nicht nur als grober Überblick.",
};

function localCards(
	entry: LocalEntry,
	form: string,
	relation: string,
	note: string,
	quote: string,
): FakeCard[] {
	const base = {
		emoji: entry.emoji,
		translations: entry.translations,
		quote,
		quoteMarks: [form],
	};
	const lemmaLink = { relation: "lemma", word: entry.lemma } as const;
	return [
		{
			...base,
			id: `${form}/Attestation`,
			kind: "Attestation",
			title: form,
			caption: `${form} · here as`,
			ipa: entry.ipa,
			definition: `This occurrence of „${form}“ in its sentence.`,
			links: [lemmaLink],
		},
		{
			...base,
			id: `${form}/Surface`,
			kind: "Surface",
			title: form,
			caption: `${form} · ${relation}`,
			ipa: entry.ipa,
			definition: note,
			links: [lemmaLink],
		},
		{
			...base,
			id: `${form}/Lemma`,
			kind: "Lemma",
			title: entry.lemma,
			caption: `${entry.lemma} · read as`,
			ipa: entry.ipa,
			definition: entry.lemmaNote,
			links: [],
		},
		{
			...base,
			id: `${form}/Reading`,
			kind: "Reading",
			title: entry.lemma,
			caption: `${entry.lemma} · ${entry.gloss}`,
			ipa: entry.ipa,
			definition: entry.definition,
			links: [],
		},
	];
}

/**
 * `resolveWord`, extended with this demo's German entries: a clicked word
 * from a Card (or a lemma link's string) finds a local entry first, and
 * the shared fixtures' Reading Cards get German definitions.
 */
export function resolveEntry(word: FixtureWord | string): FakeResolution {
	const form = typeof word === "string" ? word : word.text;
	const quote = typeof word === "string" ? "" : word.sentence;
	const key = form.toLowerCase();
	for (const entry of localEntries) {
		const known = entry.forms[key];
		if (known)
			return {
				word: form,
				cards: localCards(entry, form, known[0], known[1], quote),
			};
		if (entry.lemma.toLowerCase() === key)
			return {
				word: entry.lemma,
				cards: localCards(
					entry,
					entry.lemma,
					"form of",
					"The dictionary form itself.",
					quote,
				),
			};
	}
	const shared = resolveWord(word);
	return {
		...shared,
		cards: shared.cards.map((card) => {
			const german =
				card.kind === "Reading"
					? readingDefinitions[card.title]
					: undefined;
			return german ? { ...card, definition: german } : card;
		}),
	};
}
