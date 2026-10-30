import type { ReactNode } from "react";
import { type FixtureText, langAttrs, textFromParagraphs } from "@/fixtures";

/**
 * The two authored cases: the clicked words, glossed word by word and
 * morpheme by morpheme after the Leipzig Glossing Rules, and where each
 * piece lands in the lemma.
 */

/** One morpheme of a word: its form, its glosses and where it lands. */
export type Piece = {
	/** The morpheme as the morpheme row writes it: `hab`, `te`. */
	readonly morph: string;
	/** Its Leipzig gloss, labels in capitals: `have`, `PST.IND.3SG`. */
	readonly leipzig: string;
	/** The same with the labels spelled out as metalanguage words. */
	readonly spelled: string;
	/** The lemma pieces it becomes; none when it drops out. */
	readonly to?: readonly string[];
};

/** One word of the sentence, as a column of the gloss. */
export type Column = {
	readonly id: string;
	readonly word: string;
	/** Punctuation that follows the word in the sentence. */
	readonly after?: string;
	/** The word's plain gloss, as an interlinear reader prints it. */
	readonly plain: string;
	readonly pieces: readonly Piece[];
	/** A member of the clicked unit. */
	readonly inUnit?: true;
	/** What the word explains when it has the focus. */
	readonly note?: ReactNode;
	/** The columns the word stands in for, lit while it has the focus. */
	readonly refersTo?: readonly string[];
};

/** One word of the lemma's header. */
export type LemmaPiece = {
	readonly id: string;
	readonly text: string;
	readonly leipzig: string;
	readonly spelled: string;
	readonly plain: string;
	/** A slot such as `jM`, which a sentence fills. */
	readonly slot?: true;
	/** Shown dim: the article that only gives a noun's gender. */
	readonly quiet?: true;
	readonly note?: ReactNode;
};

export type Lemma = {
	readonly emoji: string;
	/** The header as one string: `mit jM zu tun haben`, `das Kind`. */
	readonly title: string;
	readonly pieces: readonly LemmaPiece[];
	/** Its gender's tone, for a noun. */
	readonly tone?: "neuter";
	readonly family: string;
	readonly kind: string;
	readonly tags: readonly string[];
	readonly translation: string;
	readonly definition: string;
};

export type GlossCase = {
	readonly id: "hard" | "simple";
	readonly label: string;
	readonly hint: string;
	readonly text: FixtureText;
	/** The column the reader clicks first. */
	readonly clicked: string;
	/** The clause the unit stands in, word by word, for the Sheet. */
	readonly clause: readonly Column[];
	/** The clause's free translation, the Leipzig gloss's last line. */
	readonly clauseTranslation: string;
	readonly lemma: Lemma;
};

/** A German word inside an English note. */
function De({ children }: { readonly children: ReactNode }) {
	return <i {...langAttrs("de")}>{children}</i>;
}

const word = (
	id: string,
	text: string,
	plain: string,
	pieces: readonly Piece[],
	extra: Partial<Column> = {},
): Column => ({ id, word: text, plain, pieces, ...extra });

/** A word that is one morpheme with no grammar to gloss. */
const bare = (
	id: string,
	text: string,
	gloss: string,
	extra: Partial<Column> = {},
): Column =>
	word(
		id,
		text,
		gloss,
		[{ morph: text, leipzig: gloss, spelled: gloss }],
		extra,
	);

const dassClause = [
	"dass",
	"er",
	"in",
	"einem",
	"dunklen",
	"Schrank",
	"lebte",
] as const;

const hard: GlossCase = {
	id: "hard",
	label: "hatte es damit zu tun",
	hint: "Locution: five words, two of them changed, in another order",
	text: textFromParagraphs("harry", "de", "Harry", [
		"Vielleicht {hatte|u} {es|u} {damit|u} {zu|u} {tun|u}, dass er in einem dunklen Schrank lebte, jedenfalls war Harry für sein Alter immer recht klein und dürr gewesen.",
	]),
	clicked: "damit",
	clause: [
		bare("vielleicht", "Vielleicht", "perhaps"),
		word(
			"hatte",
			"hatte",
			"had",
			[
				{
					morph: "hab",
					leipzig: "have",
					spelled: "have",
					to: ["haben"],
				},
				{
					morph: "te",
					leipzig: "PST.IND.3SG",
					spelled: "past.indicative.he/she/it",
				},
			],
			{
				inUnit: true,
				note: (
					<>
						<De>haben</De> in the past (Präteritum), third person
						singular, indicative: a plain statement, with{" "}
						<De>es</De> as its subject. In a main clause the finite
						verb stands second, here after <De>Vielleicht</De>. The
						lemma lists it last, as the infinitive <De>haben</De>.
					</>
				),
			},
		),
		word(
			"es",
			"es",
			"it",
			[{ morph: "es", leipzig: "it.NOM", spelled: "it.subject" }],
			{
				inUnit: true,
				refersTo: dassClause,
				note: (
					<>
						The subject, ‘it’: the situation from the sentence
						before, pointing ahead to the <De>dass</De>-clause. The
						lemma leaves the subject out, because it shows no slot
						for the subject.
					</>
				),
			},
		),
		word(
			"damit",
			"damit",
			"with that",
			[
				{ morph: "da", leipzig: "that", spelled: "that", to: ["jm"] },
				{ morph: "mit", leipzig: "with", spelled: "with", to: ["mit"] },
			],
			{
				inUnit: true,
				refersTo: dassClause,
				note: (
					<>
						A pronominal adverb, <De>da(r)-</De> + <De>mit</De>:{" "}
						<De>da-</De> stands in for the object of <De>mit</De>,
						‘with that’. Here it points ahead to the <De>dass</De>
						-clause, ‘…, that he lived in a dark cupboard’. In the
						lemma, <De>mit</De> stays the preposition and{" "}
						<De>da-</De> fills its <De>jM</De> slot.
					</>
				),
			},
		),
		word(
			"zu",
			"zu",
			"to",
			[{ morph: "zu", leipzig: "to", spelled: "to", to: ["zu"] }],
			{
				inUnit: true,
				note: (
					<>
						With <De>tun</De>, the zu-infinitive <De>zu tun</De>,
						‘to do’. It goes into the lemma unchanged.
					</>
				),
			},
		),
		word(
			"tun",
			"tun",
			"do",
			[
				{
					morph: "tun",
					leipzig: "do.INF",
					spelled: "do.infinitive",
					to: ["tun"],
				},
			],
			{
				inUnit: true,
				after: ",",
				note: (
					<>
						The infinitive of <De>tun</De>, ‘do’, after <De>zu</De>.
						It goes into the lemma unchanged.
					</>
				),
			},
		),
		bare("dass", "dass", "that"),
		word("er", "er", "he", [
			{ morph: "er", leipzig: "he.NOM", spelled: "he.subject" },
		]),
		bare("in", "in", "in"),
		word("einem", "einem", "a", [
			{ morph: "ein", leipzig: "a", spelled: "a" },
			{ morph: "em", leipzig: "DAT.SG", spelled: "dative.singular" },
		]),
		word("dunklen", "dunklen", "dark", [
			{ morph: "dunkl", leipzig: "dark", spelled: "dark" },
			{ morph: "en", leipzig: "DAT.SG", spelled: "dative.singular" },
		]),
		bare("schrank", "Schrank", "cupboard"),
		word(
			"lebte",
			"lebte",
			"lived",
			[
				{ morph: "leb", leipzig: "live", spelled: "live" },
				{
					morph: "te",
					leipzig: "PST.IND.3SG",
					spelled: "past.indicative.he/she/it",
				},
			],
			{ after: ", …" },
		),
	],
	clauseTranslation:
		"Perhaps it had to do with (the fact) that he lived in a dark cupboard, …",
	lemma: {
		emoji: "🔗",
		title: "mit jM zu tun haben",
		pieces: [
			{
				id: "mit",
				text: "mit",
				leipzig: "with",
				spelled: "with",
				plain: "with",
			},
			{
				id: "jm",
				text: "jM",
				leipzig: "sb.DAT",
				spelled: "someone/something.dative",
				plain: "something",
				slot: true,
				note: (
					<>
						<De>jM</De>, short for <De>jemandem</De>: the slot after{" "}
						<De>mit</De>, in the dative, for whoever or whatever it
						has to do with. In this sentence <De>da-</De> fills it.
					</>
				),
			},
			{ id: "zu", text: "zu", leipzig: "to", spelled: "to", plain: "to" },
			{
				id: "tun",
				text: "tun",
				leipzig: "do",
				spelled: "do",
				plain: "do",
			},
			{
				id: "haben",
				text: "haben",
				leipzig: "have",
				spelled: "have",
				plain: "have",
			},
		],
		family: "Locution",
		kind: "VERB",
		tags: ["Locution", "VERB"],
		translation: "to have to do with",
		definition: "mit etwas zusammenhängen",
	},
};

const simple: GlossCase = {
	id: "simple",
	label: "Kindern",
	hint: "Lexeme: one word, two endings",
	text: textFromParagraphs("kinder", "de", "Im Garten", [
		"Er spielte mit den {Kindern|u}.",
	]),
	clicked: "kindern",
	clause: [
		word("er", "Er", "he", [
			{ morph: "Er", leipzig: "he.NOM", spelled: "he.subject" },
		]),
		word("spielte", "spielte", "played", [
			{ morph: "spiel", leipzig: "play", spelled: "play" },
			{
				morph: "te",
				leipzig: "PST.IND.3SG",
				spelled: "past.indicative.he/she/it",
			},
		]),
		bare("mit", "mit", "with"),
		word("den", "den", "the", [
			{
				morph: "den",
				leipzig: "the.DAT.PL",
				spelled: "the.dative.plural",
			},
		]),
		word(
			"kindern",
			"Kindern",
			"children",
			[
				{
					morph: "Kind",
					leipzig: "child",
					spelled: "child",
					to: ["kind"],
				},
				{ morph: "er", leipzig: "PL", spelled: "plural" },
				{ morph: "n", leipzig: "DAT", spelled: "dative" },
			],
			{
				inUnit: true,
				after: ".",
				note: (
					<>
						<De>Kind</De>, ‘child’, with two endings: <De>-er</De>{" "}
						makes the plural, <De>Kinder</De>, and <De>-n</De> the
						dative plural, because <De>mit</De> takes the dative.
						The lemma is the singular, <De>das Kind</De>.
					</>
				),
			},
		),
	],
	clauseTranslation: "He played with the children.",
	lemma: {
		emoji: "🧒",
		title: "das Kind",
		pieces: [
			{
				id: "das",
				text: "das",
				leipzig: "the.N",
				spelled: "the.neuter",
				plain: "the",
				quiet: true,
				note: (
					<>
						<De>das</De>: <De>Kind</De> is neuter. The article in
						the header gives the gender; it isn’t in the sentence.
					</>
				),
			},
			{
				id: "kind",
				text: "Kind",
				leipzig: "child",
				spelled: "child",
				plain: "child",
			},
		],
		tone: "neuter",
		family: "Lexeme",
		kind: "NOUN",
		tags: ["Lexeme", "NOUN", "neuter"],
		translation: "child",
		definition: "ein Mensch, der noch nicht erwachsen ist",
	},
};

export const cases: readonly GlossCase[] = [hard, simple];

/** The clicked unit's columns, in the sentence's order. */
export function unitOf(glossCase: GlossCase): readonly Column[] {
	return glossCase.clause.filter((column) => column.inUnit);
}

/**
 * The Leipzig labels these glosses use, with what they stand for, as a
 * glossed paper's list of abbreviations gives them.
 */
export const abbreviations: Readonly<Record<string, string>> = {
	"3SG": "third person singular",
	DAT: "dative",
	IND: "indicative",
	INF: "infinitive",
	N: "neuter",
	NOM: "nominative",
	PL: "plural",
	PST: "past",
	SG: "singular",
};
