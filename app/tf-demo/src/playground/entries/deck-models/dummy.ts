/**
 * Dummy subjects for the deck-model prototypes. Nothing here touches the fake
 * db: a Library lists a few Texts, a word yields four Notes, each Note links
 * onward, and one link always leads back to a Sentence in a Text. The
 * interaction algebra is the thing under study.
 */

export type NoteKind = "Attestation" | "Reading" | "Lemma" | "Surface";

/** Deck order, user-facing first: the meaning on top, the clicked form at the bottom. */
export const NOTE_KINDS: readonly NoteKind[] = [
	"Reading",
	"Lemma",
	"Surface",
	"Attestation",
];

export type DummyText = {
	readonly id: string;
	readonly title: string;
	readonly sentences: readonly (readonly string[])[];
};

/** A place in a Text: the Sentence, and the word lit inside it. */
export type TextFocus = {
	readonly sentence: number;
	readonly word: string;
};

export type NoteLink =
	| { readonly kind: "Note"; readonly noteId: string; readonly label: string }
	| {
			readonly kind: "Text";
			readonly textId: string;
			readonly focus: TextFocus;
			readonly label: string;
	  };

/** One Source Context: a Sentence the word was met in, tokenized so its Segments can be clicked. */
export type SourceContext = {
	/** The Text the Sentence belongs to; null for filler that has no source. */
	readonly textId: string | null;
	readonly sentence: number;
	readonly words: readonly string[];
};

export type DummyNote = {
	readonly id: string;
	readonly kind: NoteKind;
	readonly word: string;
	readonly title: string;
	readonly lines: readonly string[];
	readonly links: readonly NoteLink[];
	/** The one-line footer a covered Card shows: its form, then a gloss. */
	readonly tail: { readonly form: string; readonly gloss: string };
	/** Source Contexts: sentences the word was met in, most recent first. */
	readonly contexts: readonly SourceContext[];
	/**
	 * A key into the fake db when this Note is ported: its Blocks and its
	 * Heading are the real renderers', fed by the fixture.
	 */
	readonly fixture?: string;
};

export const TEXTS: readonly DummyText[] = [
	{
		id: "haus",
		title: "Das Haus am Ende",
		sentences: [
			["Das", "Haus", "steht", "am", "Ende", "der", "Straße."],
			["Niemand", "hatte", "es", "seit", "Jahren", "betreten."],
			["Nur", "der", "Wind", "kannte", "noch", "den", "Weg", "hinein."],
			["Die", "Dämmerung", "legte", "sich", "über", "den", "Hof."],
		],
	},
	{
		id: "brief",
		title: "Der Brief",
		sentences: [
			["Der", "Brief", "lag", "seit", "Tagen", "auf", "dem", "Tisch."],
			["Niemand", "wollte", "ihn", "öffnen."],
			["Am", "Ende", "tat", "es", "der", "Wind."],
		],
	},
	{
		id: "hof",
		title: "Im Hof",
		sentences: [
			["Die", "Kinder", "riefen", "über", "den", "Hof."],
			["Ein", "Schild", "am", "Zaun", "sagte", "nur:", "Ruhe."],
			["Der", "Weg", "zum", "Haus", "war", "noch", "nass."],
		],
	},
];

export const FIRST_TEXT = TEXTS[0] as DummyText;

export function textById(id: string): DummyText {
	return TEXTS.find((text) => text.id === id) ?? FIRST_TEXT;
}

const LEMMA_OF: Readonly<Record<string, string>> = {
	Straße: "Straße",
	hatte: "haben",
	steht: "stehen",
	betreten: "betreten",
	kannte: "kennen",
	den: "der",
	Das: "der",
	der: "der",
	es: "es",
	hinein: "hinein",
	lag: "liegen",
	wollte: "wollen",
	tat: "tun",
	riefen: "rufen",
	sagte: "sagen",
	war: "sein",
	Tagen: "Tag",
	Kinder: "Kind",
};

const GLOSS: Readonly<Record<string, string>> = {
	Haus: "house",
	Dämmerung: "twilight",
	Straße: "street",
	Weg: "way",
	Wind: "wind",
	Ende: "end",
	Jahren: "years",
	Niemand: "nobody",
	hatte: "had",
	steht: "stands",
	betreten: "entered",
	kannte: "knew",
	Das: "the",
	der: "the",
	den: "the",
	am: "at the",
	es: "it",
	seit: "since",
	Nur: "only",
	noch: "still",
	hinein: "inside",
	Brief: "letter",
	lag: "lay",
	Tagen: "days",
	Tisch: "table",
	wollte: "wanted",
	öffnen: "open",
	tat: "did",
	Kinder: "children",
	riefen: "called",
	Hof: "yard",
	Schild: "sign",
	Zaun: "fence",
	Ruhe: "quiet",
	nass: "wet",
};

const FORM_OF: Readonly<Record<string, string>> = {
	Straße: "Nom. Sg.",
	Haus: "Nom. Sg.",
	Jahren: "Dat. Pl.",
	Tagen: "Dat. Pl.",
	hatte: "Prät. 3. Sg.",
	steht: "Präs. 3. Sg.",
	betreten: "Partizip II",
	kannte: "Prät. 3. Sg.",
	lag: "Prät. 3. Sg.",
	den: "Akk. Sg. m.",
	Das: "Nom. Sg. n.",
	der: "Nom. Sg. m.",
	Kinder: "Nom. Pl.",
};

const RELATED: Readonly<Record<string, string>> = {
	Haus: "Straße",
	Straße: "Weg",
	Weg: "Haus",
	Wind: "Ende",
	Ende: "Wind",
	Jahren: "Niemand",
	Brief: "Tisch",
};

/** Notes rendered from the fake db rather than from the dummy pools. */
const PORTED: Readonly<Record<string, string>> = {
	"Reading:Dämmerung": "Reading:readings-653",
};

export function noteId(kind: NoteKind, word: string): string {
	return `${kind}:${cleanWord(word)}`;
}

export function cleanWord(word: string): string {
	return word.replace(/[.,;:!?]$/u, "");
}

function lemmaOf(word: string): string {
	return LEMMA_OF[cleanWord(word)] ?? cleanWord(word);
}

const LINE_POOL = [
	"Ein kurzer Satz, der nur Platz einnimmt.",
	"Nichts hier ist echt, aber alles hat die richtige Größe.",
	"Die Zeile darunter sagt dasselbe noch einmal anders.",
	"Wer bis hierher liest, prüft die Lauflänge einer Karte.",
	"Ein Absatz endet, ein zweiter beginnt.",
	"Der Rest ist Füllung mit Absicht.",
];

const CONTEXT_POOL = [
	"Am Morgen fiel das Wort {w} zum ersten Mal.",
	"Später stand {w} noch einmal in der Zeitung.",
	"Niemand fragte, was {w} hier bedeuten sollte.",
	"Im Brief war {w} gleich zweimal unterstrichen.",
	"Zuletzt hörte sie {w} im Radio.",
];

/** Every Sentence in every Text that holds the word, then filler; most recent first. */
function contextsFor(word: string): readonly SourceContext[] {
	const clean = cleanWord(word);
	const own: SourceContext[] = [];
	for (const text of TEXTS)
		text.sentences.forEach((sentence, index) => {
			if (sentence.some((token) => cleanWord(token) === clean))
				own.push({ textId: text.id, sentence: index, words: sentence });
		});
	const filler = CONTEXT_POOL.map((line, index) => ({
		textId: null,
		sentence: index,
		words: line.replace("{w}", clean).split(" "),
	}));
	return [...own, ...filler];
}

function linesFor(kind: NoteKind, word: string): readonly string[] {
	const seed = (kind.length + word.length) % LINE_POOL.length;
	const count = 3 + ((word.length + kind.length) % 4);
	return Array.from(
		{ length: count },
		(_, index) => LINE_POOL[(seed + index) % LINE_POOL.length] ?? "",
	);
}

/** The first Sentence the word appears in, for "Go to source". */
export function sourceOf(word: string): NoteLink | null {
	const first = contextsFor(word).find((context) => context.textId !== null);
	if (!first?.textId) return null;
	return {
		kind: "Text",
		textId: first.textId,
		focus: { sentence: first.sentence, word: cleanWord(word) },
		label: "Go to source",
	};
}

export function noteFor(kind: NoteKind, word: string): DummyNote {
	const clean = cleanWord(word);
	const lemma = lemmaOf(word);
	const related = RELATED[clean];
	const links: NoteLink[] = [];
	switch (kind) {
		case "Attestation": {
			const source = sourceOf(word);
			if (source) links.push(source);
			links.push({
				kind: "Note",
				noteId: noteId("Reading", word),
				label: `Reading of ${clean}`,
			});
			break;
		}
		case "Reading":
			links.push({
				kind: "Note",
				noteId: noteId("Lemma", word),
				label: `Lemma ${lemma}`,
			});
			if (related)
				links.push({
					kind: "Note",
					noteId: noteId("Reading", related),
					label: `See also ${related}`,
				});
			break;
		case "Lemma":
			links.push(
				{
					kind: "Note",
					noteId: noteId("Reading", word),
					label: `Reading of ${clean}`,
				},
				{
					kind: "Note",
					noteId: noteId("Surface", word),
					label: `Surface ${clean}`,
				},
			);
			break;
		case "Surface":
			links.push({
				kind: "Note",
				noteId: noteId("Lemma", word),
				label: `Lemma ${lemma}`,
			});
			if (related)
				links.push({
					kind: "Note",
					noteId: noteId("Surface", related),
					label: `Surface ${related}`,
				});
			break;
	}
	const tail =
		kind === "Reading"
			? { form: GLOSS[clean] ?? clean.toLowerCase(), gloss: "meaning" }
			: kind === "Lemma"
				? {
						form: lemma,
						gloss: /^[A-ZÄÖÜ]/u.test(lemma) ? "noun" : "verb",
					}
				: kind === "Surface"
					? { form: clean, gloss: FORM_OF[clean] ?? "uninflected" }
					: { form: clean, gloss: "as written" };
	const fixture = PORTED[noteId(kind, word)];
	return {
		...(fixture ? { fixture } : {}),
		id: noteId(kind, word),
		kind,
		word: clean,
		title:
			kind === "Lemma" ? lemma : kind === "Reading" ? tail.form : clean,
		lines: linesFor(kind, word),
		links,
		tail,
		contexts: contextsFor(word),
	};
}

export function noteById(id: string): DummyNote {
	const [kind, word] = id.split(":") as [NoteKind, string];
	return noteFor(kind, word);
}

/** The four Notes a selected word deals, in reading order. */
export function deckFor(word: string): readonly DummyNote[] {
	return NOTE_KINDS.map((kind) => noteFor(kind, word));
}
