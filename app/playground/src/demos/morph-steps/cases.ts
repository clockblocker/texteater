import { type FixtureText, textFromParagraphs } from "@/fixtures";
import type { Frame, Piece, StageWord } from "./timeline";

/** One run of the lemma's header; a slot such as `jM` is set apart. */
export type LemmaRun = {
	readonly text: string;
	readonly slot?: boolean;
	readonly article?: boolean;
};

export type MorphCase = {
	readonly id: "hard" | "simple";
	readonly label: string;
	readonly hint: string;
	readonly text: FixtureText;
	/** The unit the click opens; every member of it opens it. */
	readonly unitId: string;
	/** The word the case's "try this" clicks. */
	readonly clickWord: string;
	/** The Surface Card's head: the clicked words and what they are of. */
	readonly surface: { readonly title: string; readonly caption: string };
	readonly lemma: {
		readonly runs: readonly LemmaRun[];
		readonly emoji: string;
		readonly ipa?: string;
		/** `Locution · VERB`, as tf-demo's route aside has it. */
		readonly kind: string;
		readonly gloss: string;
		readonly definition: string;
		readonly definitionLang: "de" | "en";
		readonly tone?: "neuter";
	};
	/** The surface first, the lemma last. */
	readonly frames: readonly Frame[];
};

const piece = (id: string, focus = false, text = id): Piece =>
	focus ? { id, text, focus } : { id, text };

const word = (
	id: string,
	pieces: readonly Piece[] = [piece(id)],
	extra: Omit<StageWord, "id" | "pieces"> = {},
): StageWord => ({ id, pieces, ...extra });

const ghost = (id: string, lit = false, text = id): StageWord =>
	word(id, [piece(id, false, text)], { kind: "ghost", lit });

// The hard case's words, as they first stand.
const vielleicht = (lit = false) => ghost("Vielleicht", lit);
const dass = (lit = false) => ghost("dass", lit, ", dass …");
const es = (extra: Omit<StageWord, "id" | "pieces"> = {}) =>
	word("es", [piece("es", extra.tag !== undefined)], extra);
const da = word("da");
const mit = word("mit", [piece("mit")], { glue: true });
const zuTun = word("zu tun");
const hatte = (focus: "all" | "ending" | "none" = "none", tag?: string) =>
	word(
		"hatte",
		[piece("ha", focus === "all"), piece("tte", focus !== "none")],
		tag ? { tag } : {},
	);
const haben = (focus = false, tag?: string) =>
	word("hatte", [piece("ha"), piece("ben", focus)], tag ? { tag } : {});
const slot = (focus = false, tag?: string) =>
	word("da", [piece("da", focus, "jM")], {
		kind: "slot",
		...(tag ? { tag } : {}),
	});

const hardText = textFromParagraphs("harry", "de", "Harry Potter", [
	"Vielleicht {hatte|mit-zu-tun-haben} {es|mit-zu-tun-haben} {damit|mit-zu-tun-haben} {zu|mit-zu-tun-haben} {tun|mit-zu-tun-haben}, dass er in einem dunklen Schrank lebte, jedenfalls war Harry für sein Alter immer recht klein und dürr gewesen.",
]);

const hard: MorphCase = {
	id: "hard",
	label: "hatte es damit zu tun",
	hint: "A Locution: four words, one lemma",
	text: hardText,
	unitId: "mit-zu-tun-haben",
	clickWord: "damit",
	surface: { title: "hatte es damit zu tun", caption: "past of" },
	lemma: {
		runs: [
			{ text: "mit" },
			{ text: "jM", slot: true },
			{ text: "zu tun" },
			{ text: "haben" },
		],
		emoji: "🔗",
		kind: "Locution · VERB",
		gloss: "to have to do with",
		definition: "mit etwas zusammenhängen",
		definitionLang: "de",
	},
	frames: [
		{
			words: [
				vielleicht(true),
				hatte("all"),
				es(),
				da,
				mit,
				zuTun,
				dass(),
			],
			caption:
				"In a main clause the verb comes second: *hatte*, right after *Vielleicht*.",
		},
		{
			words: [es(), da, mit, zuTun, hatte("all"), dass()],
			caption: "A dictionary puts the verb last.",
		},
		{
			words: [
				es(),
				da,
				mit,
				zuTun,
				hatte("ending", "past · 3rd sg"),
				dass(),
			],
			caption:
				"*hatte* is *haben* in the past, ‘it had’: Präteritum, 3rd person singular, indicative.",
		},
		{
			words: [es(), da, mit, zuTun, haben(true, "infinitive"), dass()],
			caption: "The dictionary lists the infinitive: *haben*.",
		},
		{
			words: [es({ tag: "it" }), da, mit, zuTun, haben(), dass(true)],
			caption:
				"*es*, ‘it’, is the subject. It points ahead: the *dass*-clause says what ‘it’ is.",
		},
		{
			words: [da, mit, zuTun, haben(), dass()],
			caption: "A dictionary entry leaves the subject out.",
		},
		{
			words: [
				word("da", [piece("da", true)], { tag: "that" }),
				word("mit", [piece("mit", true)], { tag: "with" }),
				zuTun,
				haben(),
				dass(true),
			],
			caption:
				"*damit* is *da* + *mit*, ‘with that’. Here *da* stands for the *dass*-clause.",
		},
		{
			words: [word("mit"), slot(true, "dative"), zuTun, haben()],
			caption:
				"The entry keeps *mit* and leaves its object open: *jM*, someone or something, in the dative.",
		},
		{
			words: [
				word("mit"),
				slot(),
				word("zu tun", [piece("zu tun", true)], { tag: "unchanged" }),
				haben(),
			],
			caption:
				"*zu tun* stays as it is. Together: *mit jM zu tun haben*, ‘to have to do with’.",
		},
	],
};

// The simple case's words.
const kindern = (
	pieces: readonly Piece[],
	extra: Omit<StageWord, "id" | "pieces"> = {},
) => word("Kindern", pieces, extra);

const simpleText = textFromParagraphs("spiel", "de", "Im Garten", [
	"Er spielte mit den {Kindern|kind}.",
]);

const simple: MorphCase = {
	id: "simple",
	label: "Kindern",
	hint: "A Lexeme: one word, two endings",
	text: simpleText,
	unitId: "kind",
	clickWord: "Kindern",
	surface: { title: "Kindern", caption: "dative plural of" },
	lemma: {
		runs: [{ text: "das", article: true }, { text: "Kind" }],
		emoji: "🧒",
		ipa: "kɪnt",
		kind: "Lexeme · NOUN",
		gloss: "child",
		definition: "A young human being; also a son or daughter of any age.",
		definitionLang: "en",
		tone: "neuter",
	},
	frames: [
		{
			words: [
				ghost("mit"),
				ghost("den"),
				kindern([piece("Kind"), piece("er", true), piece("n", true)]),
			],
			caption: "*Kindern* is *Kind* with two endings.",
		},
		{
			words: [
				ghost("mit", true),
				ghost("den"),
				kindern([piece("Kind"), piece("er"), piece("n", true)], {
					tag: "dative",
				}),
			],
			caption:
				"*-n* makes it dative plural, because *mit* takes the dative.",
		},
		{
			words: [kindern([piece("Kind"), piece("er")])],
			caption: "Without it: *Kinder*, the plain plural.",
		},
		{
			words: [
				kindern([piece("Kind"), piece("er", true)], { tag: "plural" }),
			],
			caption: "*-er* makes the plural: *ein Kind*, *zwei Kinder*.",
		},
		{
			words: [kindern([piece("Kind")])],
			caption: "The singular, as the dictionary lists it: *Kind*.",
		},
		{
			words: [
				word("das", [piece("das", true)], { tone: "neuter" }),
				kindern([piece("Kind")], { tone: "neuter" }),
			],
			caption: "*Kind* is neuter: *das Kind*, ‘the child’.",
		},
	],
};

export const cases: readonly MorphCase[] = [hard, simple];

/** The lemma's header as plain text: `mit jM zu tun haben`. */
export function lemmaText(morph: MorphCase): string {
	return morph.lemma.runs.map((run) => run.text).join(" ");
}
