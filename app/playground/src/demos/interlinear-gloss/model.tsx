import type { ReactNode } from "react";
import { type FixtureText, langAttrs } from "@/fixtures";

/**
 * The model the cards gloss (#1293): the Attestation is the words on the
 * page, the Surface is their stored form as a slotted line, and the Lemma
 * is what that line inflects from. Attestation → Surface is syntax: the
 * words move back into base order and fill the line's slots. Surface →
 * Lemma is inflection: the endings come off and the subject slot drops
 * out. Each step is one card's gloss: a row of columns over a row of
 * targets, with a line from each piece to where it lands.
 */

/** How a token prints in a slotted line, as tf-demo's valency styles do. */
export type TokenStyle = "slot" | "prep";

/** One morpheme of a column: its form, its glosses and where it lands. */
export type Piece = {
	/** The morpheme as the morpheme row writes it: `hab`, `te`. */
	readonly morph: string;
	/** Its Leipzig gloss, labels in capitals: `have`, `PST.IND.3SG`. */
	readonly leipzig: string;
	/** The same with the labels spelled out as metalanguage words. */
	readonly spelled: string;
	/** The targets it becomes; none when it drops out. */
	readonly to?: readonly string[];
};

/** One word of a step's top row, as a column of the gloss. */
export type Column = {
	readonly id: string;
	readonly word: string;
	readonly style?: TokenStyle;
	/** The word's plain gloss, as an interlinear reader prints it. */
	readonly plain: string;
	readonly pieces: readonly Piece[];
	/** The whole word leaves the line: it gets a stub, not a landing. */
	readonly drops?: true;
	/** What the word explains when it has the focus. */
	readonly note?: ReactNode;
	/** The sentence's words it stands in for, lit while it has the focus. */
	readonly refersTo?: readonly string[];
};

/** One token of the line a step lands on. */
export type Target = {
	readonly id: string;
	readonly text: string;
	readonly style?: TokenStyle;
	/** Shown dim: the article that only gives a noun's gender. */
	readonly quiet?: true;
	readonly note?: ReactNode;
};

/** One card's gloss: its columns, the line they land on, the first focus. */
export type Step = {
	readonly columns: readonly Column[];
	readonly targets: readonly Target[];
	/** The column that has the focus when the card comes to the front. */
	readonly first: string;
};

/** What the context sets when syntax has nothing to move: `mit` → dative. */
type Governor = {
	readonly word: string;
	readonly leipzig: string;
	readonly spelled: string;
	readonly note: ReactNode;
};

type Attestation = {
	/** The words on the page: `hatte es damit zu tun`. */
	readonly title: string;
	/** How they become the Surface line; none when nothing moves. */
	readonly syntax: Step | null;
	/** The one line a static Attestation card shows instead. */
	readonly governor?: Governor;
};

type Surface = {
	/** The slotted line as text, for crumbs and assistive tech. */
	readonly title: string;
	readonly inflection: Step;
};

type Lemma = {
	readonly emoji: string;
	/** The header as one string: `mit jM zu tun haben`, `das Kind`. */
	readonly title: string;
	/** Its gender's tone, for a noun. */
	readonly tone?: "neuter";
	readonly family: string;
	readonly kind: string;
	readonly tags: readonly string[];
	readonly translation: string;
	readonly definition: string;
};

/** One word of the sentence the Attestation stands in, for the Sheet. */
export type SentenceWord = {
	readonly id: string;
	readonly word: string;
	/** Punctuation that follows the word in the sentence. */
	readonly after?: string;
	readonly plain: string;
	/** A member of the clicked unit. */
	readonly inUnit?: true;
};

export type GlossCase = {
	readonly id: "hard" | "simple";
	readonly label: string;
	readonly hint: string;
	readonly text: FixtureText;
	readonly sentence: readonly SentenceWord[];
	/** The sentence's free translation, the Leipzig gloss's last line. */
	readonly sentenceTranslation: string;
	readonly attestation: Attestation;
	readonly surface: Surface;
	readonly lemma: Lemma;
};

/** A German word inside an English note. */
export function De({ children }: { readonly children: ReactNode }) {
	return <i {...langAttrs("de")}>{children}</i>;
}

/** A word that is one morpheme, carried over to `to`. */
export const whole = (
	morph: string,
	leipzig: string,
	to?: string,
	spelled = leipzig,
): Piece => ({ morph, leipzig, spelled, ...(to ? { to: [to] } : {}) });

/** The Surface's columns as the line the Attestation lands on. */
export const lineOf = (columns: readonly Column[]): readonly Target[] =>
	columns.map(({ id, word, style }) => ({
		id,
		text: word,
		...(style ? { style } : {}),
	}));

/**
 * The Leipzig labels these glosses use, with what they stand for, as a
 * glossed paper's list of abbreviations gives them.
 */
export const abbreviations: Readonly<Record<string, string>> = {
	"3SG": "third person singular",
	DAT: "dative",
	IND: "indicative",
	INF: "infinitive",
	NOM: "nominative",
	PL: "plural",
	PST: "past",
	SBJ: "subject",
};
