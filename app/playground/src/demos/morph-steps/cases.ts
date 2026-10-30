import { type FixtureText, textFromParagraphs } from "@/fixtures";
import type { Piece, StageWord, Track } from "./timeline";

/**
 * One run of a heading line, in tf-demo's valency styles: a governed
 * preposition such as `mit` in italics, a slot such as `jM` as its case
 * token, a noun's article dim.
 */
export type LineRun = {
	readonly text: string;
	readonly style?: "preposition" | "slot" | "article";
};

/**
 * Syntax on the Attestation Card: a track from the words on the page to
 * the Surface, or, with nothing to rearrange, the one line a still Card
 * says.
 */
type Syntax =
	| { readonly kind: "track"; readonly track: Track }
	| { readonly kind: "still"; readonly line: string };

export type MorphCase = {
	readonly id: "hard" | "simple";
	readonly label: string;
	readonly hint: string;
	readonly text: FixtureText;
	/** The unit the click opens; every member of it opens it. */
	readonly unitId: string;
	/** The word the case's "try this" clicks. */
	readonly clickWord: string;
	/**
	 * The Attestation Card, headed by the unit's words as the page has them.
	 * `caption` is tf-demo's: what the words are to the Surface, none when
	 * the title says it.
	 */
	readonly attestation: {
		readonly caption: string | null;
		readonly syntax: Syntax;
	};
	/**
	 * The Surface Card, headed by its slotted line, `jD mit jM zu tun
	 * hatte`; `caption` is tf-demo's, what the form is of the Lemma, and
	 * `aside` the route's note beside the line on the Attestation Card.
	 */
	readonly surface: {
		readonly line: readonly LineRun[];
		readonly caption: string;
		readonly aside: string;
		readonly inflection: Track;
	};
	readonly lemma: {
		readonly runs: readonly LineRun[];
		readonly emoji: string;
		readonly ipa?: string;
		/** `Locution · VERB`, as tf-demo's route aside has it. */
		readonly kind: string;
		readonly gloss: string;
		readonly definition: string;
		readonly definitionLang: "de" | "en";
		readonly tone?: "neuter";
	};
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
const fixedMit = (focus = false) =>
	word("mit", [piece("mit", focus)], { kind: "preposition" });
// The Surface, where Syntax rests and Inflection starts.
const surfaceWords = [subject(), fixedMit(), dative(), zuTun, hatte()];

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
	attestation: {
		caption: "split form of",
		syntax: {
			kind: "track",
			track: {
				name: "Syntax",
				result: "Surface",
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
						words: surfaceWords,
						caption:
							"The expression's words as they stand here, each slot as its case, the verb last.",
					},
				],
			},
		},
	},
	surface: {
		line: [
			{ text: "jD", style: "slot" },
			{ text: "mit", style: "preposition" },
			{ text: "jM", style: "slot" },
			{ text: "zu tun" },
			{ text: "hatte" },
		],
		caption: "past of",
		aside: "past · 3rd sg",
		inflection: {
			name: "Inflection",
			result: "Lemma",
			start: {
				words: surfaceWords,
				caption:
					"Base order, each slot as its case. Only *hatte* is still inflected.",
			},
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
					caption: "The dictionary lists the infinitive: *haben*.",
				},
				{
					words: [fixedMit(), dative(), zuTun, haben()],
					caption:
						"The Lemma leaves the subject out, so *jD* goes: *mit jM zu tun haben*, ‘to have to do with’.",
				},
			],
		},
	},
	lemma: {
		runs: [
			{ text: "mit", style: "preposition" },
			{ text: "jM", style: "slot" },
			{ text: "zu tun" },
			{ text: "haben" },
		],
		emoji: "🔗",
		kind: "Locution · VERB",
		gloss: "to have to do with",
		definition: "mit etwas zusammenhängen",
		definitionLang: "de",
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
	attestation: {
		caption: null,
		syntax: {
			kind: "still",
			line: "*mit* takes the dative: *mit den Kindern*.",
		},
	},
	surface: {
		line: [{ text: "Kindern" }],
		caption: "dative plural of",
		aside: "dative plural",
		inflection: {
			name: "Inflection",
			result: "Lemma",
			start: {
				words: [kindern([piece("Kind"), piece("er"), piece("n")])],
				caption: "*Kindern* is *Kind* with two endings.",
			},
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
					caption: "*-n* marks the dative plural.",
				},
				{
					words: [
						kindern([piece("Kind"), piece("er", true)], {
							tag: "plural",
						}),
					],
					caption: "Without it, *Kinder*: *-er* makes the plural.",
				},
				{
					words: [
						word("das", [piece("das", true)], { tone: "neuter" }),
						kindern([piece("Kind")], { tone: "neuter" }),
					],
					caption:
						"The singular, as the dictionary lists it, is neuter: *das Kind*, ‘the child’.",
				},
			],
		},
	},
	lemma: {
		runs: [{ text: "das", style: "article" }, { text: "Kind" }],
		emoji: "🧒",
		ipa: "kɪnt",
		kind: "Lexeme · NOUN",
		gloss: "child",
		definition: "A young human being; also a son or daughter of any age.",
		definitionLang: "en",
		tone: "neuter",
	},
};

export const cases: readonly MorphCase[] = [hard, simple];

/** A line as plain text: `jD mit jM zu tun hatte`. */
export function lineText(runs: readonly LineRun[]): string {
	return runs.map((run) => run.text).join(" ");
}
