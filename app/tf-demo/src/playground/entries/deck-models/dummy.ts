/**
 * Dummy subjects for the deck-model prototypes. Nothing here touches the fake
 * db: a word yields four Notes, each Note links onward, and one link always
 * leads back to the Text. The interaction algebra is the thing under study.
 */

export type NoteKind = "Attestation" | "Reading" | "Lemma" | "Surface";

/** Deck order, user-facing first: the meaning on top, the clicked form at the bottom. */
export const NOTE_KINDS: readonly NoteKind[] = [
	"Reading",
	"Lemma",
	"Surface",
	"Attestation",
];

export type NoteLink =
	| { readonly kind: "Note"; readonly noteId: string; readonly label: string }
	| { readonly kind: "Text"; readonly word: string; readonly label: string };

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
	readonly contexts: readonly string[];
};

export type DummySubject =
	| { readonly kind: "Text" }
	| { readonly kind: "Note"; readonly noteId: string };

export const TEXT_SENTENCES: readonly (readonly string[])[] = [
	["Das", "Haus", "steht", "am", "Ende", "der", "Straße."],
	["Niemand", "hatte", "es", "seit", "Jahren", "betreten."],
	["Nur", "der", "Wind", "kannte", "noch", "den", "Weg", "hinein."],
];

const LEMMA_OF: Readonly<Record<string, string>> = {
	"Straße.": "Straße",
	hatte: "haben",
	steht: "stehen",
	betreten: "betreten",
	kannte: "kennen",
	den: "der",
	Das: "der",
	der: "der",
	es: "es",
	"hinein.": "hinein",
};

const GLOSS: Readonly<Record<string, string>> = {
	Haus: "house",
	"Straße.": "street",
	Weg: "way",
	Wind: "wind",
	Ende: "end",
	Jahren: "years",
	Niemand: "nobody",
	hatte: "had",
	steht: "stands",
	"betreten.": "entered",
	kannte: "knew",
	Das: "the",
	der: "the",
	den: "the",
	am: "at the",
	es: "it",
	seit: "since",
	Nur: "only",
	noch: "still",
	"hinein.": "inside",
};

const FORM_OF: Readonly<Record<string, string>> = {
	"Straße.": "Nom. Sg.",
	Haus: "Nom. Sg.",
	Jahren: "Dat. Pl.",
	hatte: "Prät. 3. Sg.",
	steht: "Präs. 3. Sg.",
	"betreten.": "Partizip II",
	kannte: "Prät. 3. Sg.",
	den: "Akk. Sg. m.",
	Das: "Nom. Sg. n.",
	der: "Nom. Sg. m.",
};

const RELATED: Readonly<Record<string, string>> = {
	Haus: "Straße.",
	"Straße.": "Weg",
	Weg: "Haus",
	Wind: "Ende",
	Ende: "Wind",
	Jahren: "Niemand",
};

export function noteId(kind: NoteKind, word: string): string {
	return `${kind}:${word}`;
}

export function cleanWord(word: string): string {
	return word.replace(/[.,;!?]$/u, "");
}

function lemmaOf(word: string): string {
	return LEMMA_OF[word] ?? cleanWord(word);
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
	"Die Kinder riefen {w} über den Hof.",
	"Ein Schild am Zaun sagte nur: {w}.",
	"Zuletzt hörte sie {w} im Radio.",
];

/** The Text's own sentences with the word first, then filler, most recent first. */
function contextsFor(word: string): readonly string[] {
	const clean = cleanWord(word);
	const own = TEXT_SENTENCES.filter((sentence) =>
		sentence.some((token) => cleanWord(token) === clean),
	).map((sentence) => sentence.join(" "));
	const filler = CONTEXT_POOL.map((line) => line.replace("{w}", clean));
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

export function noteFor(kind: NoteKind, word: string): DummyNote {
	const clean = cleanWord(word);
	const lemma = lemmaOf(word);
	const related = RELATED[word];
	const links: NoteLink[] = [];
	switch (kind) {
		case "Attestation":
			links.push(
				{ kind: "Text", word, label: "Go to source" },
				{
					kind: "Note",
					noteId: noteId("Reading", word),
					label: `Reading of ${clean}`,
				},
			);
			break;
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
					label: `See also ${cleanWord(related)}`,
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
					label: `Surface ${cleanWord(related)}`,
				});
			break;
	}
	const tail =
		kind === "Reading"
			? { form: GLOSS[word] ?? clean.toLowerCase(), gloss: "meaning" }
			: kind === "Lemma"
				? {
						form: lemma,
						gloss: /^[A-ZÄÖÜ]/u.test(lemma) ? "noun" : "verb",
					}
				: kind === "Surface"
					? { form: clean, gloss: FORM_OF[word] ?? "uninflected" }
					: { form: word, gloss: "as written" };
	return {
		id: noteId(kind, word),
		kind,
		word,
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

export function subjectLabel(subject: DummySubject): string {
	if (subject.kind === "Text") return "Text";
	const note = noteById(subject.noteId);
	return `${note.kind} · ${note.title}`;
}
