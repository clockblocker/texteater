/**
 * Closed-class identity for German uninflected function words, from the
 * #734 ruling (2026-09-29, issuecomment-5897200578): PART is nicht,
 * infinitive zu and the modal particles; focus and degree words and
 * sentence adverbs are ADV; answers are INTJ; aber is CCONJ in every
 * position. A piece whose spelling the ruling covers chooses among the uses
 * the ruling gives that spelling, and the use implies the route (Dumgen ADR
 * 0007's closed-class rule, extended to PART as #734 allows).
 *
 * The members are encoded here, not in dumspec; #747 will author them
 * there.
 */
import type { RouteKey } from "./routes.js";
import type { Piece } from "./sentence.js";

export type ClosedClassQuestion = {
	readonly instructions: (piece: string) => string;
	readonly criteria: Readonly<Record<string, string>>;
};

type Use = { readonly description: string; readonly route: RouteKey };

const modal = (example: string): Use => ({
	description: `A modal particle: unstressed, in the middle of the clause, adding the speaker's attitude rather than content; it cannot stand first or answer a question (${example})`,
	route: "Lexeme/PART",
});
const focus = (example: string): Use => ({
	description: `A focus word picking out one part of the sentence (${example})`,
	route: "Lexeme/ADV",
});
const adverb = (description: string): Use => ({
	description,
	route: "Lexeme/ADV",
});
const adjective = (description: string): Use => ({
	description,
	route: "Lexeme/ADJ",
});
const answer = (example: string): Use => ({
	description: `An answer word replying to a question, also reported (${example})`,
	route: "Lexeme/INTJ",
});

/** The uses the #734 ruling gives each spelling. */
const uses: Readonly<Record<string, Readonly<Record<string, Use>>>> = {
	ja: {
		modal: modal("Du kennst den Weg ja"),
		answer: answer("Kommst du? – Ja."),
	},
	doch: {
		modal: modal("Komm doch herein"),
		answer: answer("Kommst du nicht? – Doch."),
		conjunction: {
			description:
				"A conjunction 'but, yet' joining two clauses or phrases (Er wollte kommen, doch der Zug fiel aus)",
			route: "Lexeme/CCONJ",
		},
		adverb: adverb(
			"Stressed 'after all, nevertheless' (Er ist doch gekommen; dann doch)",
		),
	},
	denn: {
		modal: modal("Kann er denn sterben?"),
		conjunction: {
			description:
				"A conjunction 'because, for' opening a main clause (Wir gehen, denn es wird spät)",
			route: "Lexeme/CCONJ",
		},
	},
	aber: {
		conjunction: {
			description:
				"The conjunction 'but, however', in any position of its clause (aber er kam; Bald aber lernte er)",
			route: "Lexeme/CCONJ",
		},
		modal: modal("Das ist aber schön!"),
	},
	halt: {
		modal: modal("Dann warten wir halt"),
		interjection: {
			description: "The exclamation 'stop!' (Halt!)",
			route: "Lexeme/INTJ",
		},
	},
	mal: {
		modal: modal("Sieh mal"),
		adverb: adverb(
			"'times, once' counting occurrences (drei mal, noch mal)",
		),
	},
	einmal: {
		modal: modal("Sieh einmal"),
		adverb: adverb("'once, one time' (Ich war einmal dort)"),
	},
	eben: {
		modal: modal("Das ist eben so"),
		focus: focus("eben das meinte ich = precisely that"),
		temporal: adverb("'just now' (Sie ist eben gegangen)"),
		adjective: adjective("The adjective 'flat, even' (ein ebener Weg)"),
	},
	wohl: {
		modal: modal("Er wird wohl kommen = I suppose"),
		adverb: adverb(
			"'well' or 'probably' as its own content (Mir ist nicht wohl; wohl bekannt)",
		),
	},
	eigentlich: {
		modal: modal("Was wolltest du eigentlich?"),
		adverb: adverb(
			"A sentence adverb 'actually, in fact' commenting on the statement",
		),
	},
	bloß: {
		modal: modal("Wie konnte das bloß passieren?"),
		focus: focus("Er arbeitet bloß vormittags = only"),
		adjective: adjective("The adjective 'bare, mere' (mit bloßen Händen)"),
	},
	nur: {
		modal: modal("Was hat er nur?"),
		focus: focus("Sie braucht nur einen Schraubendreher = only"),
	},
	etwa: {
		modal: modal("Hast du etwa keinen Schlüssel?"),
		adverb: adverb(
			"'about, approximately' with a number or amount (etwa zehn Leute)",
		),
	},
	schon: {
		modal: modal("Das wird schon klappen"),
		temporal: adverb("'already' (Der Bus kam schon)"),
		focus: focus("schon der Gedanke = the mere thought"),
	},
	auch: {
		modal: modal("Wie heißt du auch gleich?"),
		focus: focus("Ich komme auch = too, also"),
	},
	vielleicht: {
		modal: modal("Das war vielleicht ein Spaß!"),
		adverb: adverb(
			"A sentence adverb 'perhaps, maybe' (Vielleicht kommt er)",
		),
	},
	einfach: {
		modal: modal("Das ist einfach toll"),
		adjective: adjective(
			"The adjective 'simple, simply' in its own sense (eine einfache Aufgabe; einfach erklärt)",
		),
	},
	ruhig: {
		modal: modal("Komm ruhig herein = feel free"),
		adjective: adjective("The adjective 'calm, quiet' (Er blieb ruhig)"),
	},
	zu: {
		infinitive: {
			description:
				"The infinitive marker before an infinitive, without um, ohne or statt (versucht zu schlafen)",
			route: "Lexeme/PART",
		},
		degree: adverb(
			"The degree word 'too' before an adjective or adverb (zu schnell)",
		),
		preposition: {
			description:
				"A preposition 'to, at' opening a phrase (zu Hause, zu ihm)",
			route: "Lexeme/ADP",
		},
	},
	ganz: {
		degree: adverb(
			"The degree word 'quite, fairly' before an adjective (ganz gut)",
		),
		adjective: adjective(
			"The adjective 'whole, entire, completely' (die ganze Stadt; ganz aufgegessen)",
		),
	},
	ziemlich: {
		degree: adverb("The degree word 'rather, fairly' (ziemlich spät)"),
		adjective: adjective(
			"The adjective 'considerable' before a noun (eine ziemliche Menge)",
		),
	},
	recht: {
		degree: adverb(
			"The degree word 'fairly, really' (recht gut; ohne recht zu glauben)",
		),
		adjective: adjective(
			"The adjective 'right, proper' (die rechte Hand; das ist mir recht)",
		),
	},
	früh: {
		morning: adverb(
			"'in the morning' after a time (acht Uhr früh; heute früh)",
		),
		adjective: adjective(
			"The adjective 'early' (früh aufstehen; der frühe Vogel)",
		),
	},
	offenbar: {
		sentence: adverb(
			"A sentence adverb 'apparently' commenting on the statement",
		),
		adjective: adjective(
			"The adjective 'obvious' describing a thing (ein offenbarer Irrtum)",
		),
	},
	wahrscheinlich: {
		sentence: adverb("A sentence adverb 'probably'"),
		adjective: adjective(
			"The adjective 'likely, probable' describing a thing (eine wahrscheinliche Folge)",
		),
	},
	natürlich: {
		sentence: adverb("A sentence adverb 'of course'"),
		adjective: adjective(
			"The adjective 'natural' (natürliches Licht; sie lachte natürlich = naturally)",
		),
	},
	wirklich: {
		sentence: adverb("A sentence adverb 'really, in fact'"),
		adjective: adjective(
			"The adjective 'real, actual' (eine wirkliche Gefahr)",
		),
	},
};

/** Spellings with one use only: the ruling decides them outright. */
const fixed: Readonly<Record<string, RouteKey>> = {
	nicht: "Lexeme/PART",
	nein: "Lexeme/INTJ",
	sehr: "Lexeme/ADV",
	allzu: "Lexeme/ADV",
	gar: "Lexeme/ADV",
	sogar: "Lexeme/ADV",
	lediglich: "Lexeme/ADV",
	selbst: "Lexeme/ADV",
	noch: "Lexeme/ADV",
	erst: "Lexeme/ADV",
};

const spelling = (piece: Piece) => piece.text.toLowerCase();

export function closedClassQuestion(
	piece: Piece,
): ClosedClassQuestion | undefined {
	const options = uses[spelling(piece)];
	if (!options) return undefined;
	return {
		instructions: (ref) => `In \`sentence\`, which use of ${ref} is this?`,
		criteria: Object.fromEntries(
			Object.entries(options).map(([key, use]) => [key, use.description]),
		),
	};
}

/** The route a chosen use implies, or the fixed route of a one-use spelling. */
export function closedClassRoute(
	piece: Piece,
	choice: string | undefined,
): RouteKey | undefined {
	const word = spelling(piece);
	if (fixed[word]) return fixed[word];
	return choice === undefined ? undefined : uses[word]?.[choice]?.route;
}

export const hasFixedRoute = (piece: Piece) =>
	fixed[spelling(piece)] !== undefined;

/** A Choice over a spelling's uses, as the shares of the routes they imply. */
export function closedClassRouteShares(
	piece: Piece,
	probabilities: Readonly<Record<string, number>>,
): Record<RouteKey, number> {
	const options = uses[spelling(piece)] ?? {};
	const shares: Record<RouteKey, number> = {};
	for (const [use, share] of Object.entries(probabilities)) {
		const route = options[use]?.route;
		if (route) shares[route] = (shares[route] ?? 0) + share;
	}
	return shares;
}
