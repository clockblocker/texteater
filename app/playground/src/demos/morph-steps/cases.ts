import { type FixtureText, textFromParagraphs } from "@/fixtures";
import type { Piece, StageWord, Timeline } from "./timeline";

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
	/** The Attestation, then Syntax to the Surface, Inflection to the Lemma. */
	readonly timeline: Timeline;
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
const es = word("es");
const damit = [word("da"), word("mit", [piece("mit")], { glue: true })];
const zuTun = word("zu tun");
const hatte = (focus: "all" | "ending" | "none" = "none", tag?: string) =>
	word(
		"hatte",
		[piece("ha", focus === "all"), piece("tte", focus !== "none")],
		tag ? { tag } : {},
	);
const haben = (focus = false, tag?: string) =>
	word("hatte", [piece("ha"), piece("ben", focus)], tag ? { tag } : {});
// `es` and `da-` keep their ids as they turn into their slots, so they
// travel and only their text cross-fades.
const subject = (focus = false, tag?: string) =>
	word("es", [piece("es", focus, "jD")], {
		kind: "slot",
		...(tag ? { tag } : {}),
	});
const dative = (focus = false, tag?: string) =>
	word("da", [piece("da", focus, "jM")], {
		kind: "slot",
		...(tag ? { tag } : {}),
	});
const fixedMit = (focus = false) => word("mit", [piece("mit", focus)]);

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
	timeline: {
		start: {
			words: [
				vielleicht(true),
				hatte("all"),
				es,
				...damit,
				zuTun,
				dass(),
			],
			caption:
				"In a main clause the verb comes second: *hatte*, right after *Vielleicht*.",
		},
		stages: [
			{
				name: "Syntax",
				result: "Surface",
				frames: [
					{
						words: [es, ...damit, zuTun, hatte("all"), dass()],
						caption: "In base order the verb goes last.",
					},
					{
						words: [
							subject(true, "subject"),
							...damit,
							zuTun,
							hatte(),
						],
						caption:
							"*es* fills the subject slot, so it becomes *jD*: someone, in the nominative.",
					},
					{
						words: [
							subject(),
							fixedMit(true),
							dative(true, "dative"),
							zuTun,
							hatte(),
						],
						caption:
							"*damit* is *da-* + *mit*. *mit* is the expression's own word; *da-* fills a slot and becomes *jM*, in the dative.",
					},
					{
						words: [
							subject(),
							fixedMit(),
							dative(),
							zuTun,
							hatte(),
						],
						caption:
							"The expression's words as they stand here, each slot as its case, the verb last.",
					},
				],
			},
			{
				name: "Inflection",
				result: "Lemma",
				frames: [
					{
						words: [
							subject(),
							fixedMit(),
							dative(),
							zuTun,
							hatte("ending", "past · 3rd sg"),
						],
						caption:
							"*hatte* is *haben* in the past: Präteritum, 3rd person singular, indicative.",
					},
					{
						words: [
							subject(),
							fixedMit(),
							dative(),
							zuTun,
							haben(true, "infinitive"),
						],
						caption:
							"The dictionary lists the infinitive: *haben*.",
					},
					{
						words: [fixedMit(), dative(), zuTun, haben()],
						caption:
							"The Lemma leaves the subject out, so *jD* goes: *mit jM zu tun haben*, ‘to have to do with’.",
					},
				],
			},
		],
	},
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
	timeline: {
		start: {
			words: [
				ghost("mit", true),
				ghost("den"),
				kindern([piece("Kind"), piece("er"), piece("n")]),
			],
			caption: "*mit* takes the dative: *mit den Kindern*.",
		},
		stages: [
			{
				name: "Syntax",
				result: "Surface",
				frames: [
					{
						words: [
							kindern([piece("Kind"), piece("er"), piece("n")], {
								tag: "dative",
							}),
						],
						caption:
							"One word, so nothing to rearrange: the Surface is *Kindern*, in the dative.",
					},
				],
			},
			{
				name: "Inflection",
				result: "Lemma",
				frames: [
					{
						words: [
							kindern(
								[piece("Kind"), piece("er"), piece("n", true)],
								{
									tag: "dative pl.",
								},
							),
						],
						caption:
							"*Kindern* is *Kind* with two endings. *-n* marks the dative plural.",
					},
					{
						words: [
							kindern([piece("Kind"), piece("er", true)], {
								tag: "plural",
							}),
						],
						caption:
							"Without it, *Kinder*: *-er* makes the plural.",
					},
					{
						words: [
							word("das", [piece("das", true)], {
								tone: "neuter",
							}),
							kindern([piece("Kind")], { tone: "neuter" }),
						],
						caption:
							"The singular, as the dictionary lists it, is neuter: *das Kind*, ‘the child’.",
					},
				],
			},
		],
	},
};

export const cases: readonly MorphCase[] = [hard, simple];

/** The lemma's header as plain text: `mit jM zu tun haben`. */
export function lemmaText(morph: MorphCase): string {
	return morph.lemma.runs.map((run) => run.text).join(" ");
}
