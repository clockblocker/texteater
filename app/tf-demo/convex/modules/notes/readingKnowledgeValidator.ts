import { v } from "convex/values";
import {
	formulaRoleValues,
	locutionTypeValues,
	sayingTypeValues,
	translationPieceKindValues,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import { literalUnion } from "../../model/validators";
import { participleMeaningValidator } from "./relations";

const readingValueLemmaValidator = v.object({
	unitKind: v.literal("Lemma"),
	language: v.string(),
	family: v.string(),
	kind: v.string(),
	canonicalForm: v.string(),
	coreFeatures: v.any(),
});

/** A Unit Shadow a pending link names (ADR 0050). */
const linkTargetShadowValidator = v.object({
	language: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
});
/** Where a Breakdown piece or a Source links: a Lemma, or a pending Shadow. */
const linkTargetValidator = v.union(
	readingValueLemmaValidator,
	linkTargetShadowValidator,
);
const breakdownPiecesValidator = v.array(
	v.object({ letters: v.string(), target: v.optional(linkTargetValidator) }),
);

/** A Translation: its Translation Pieces in reading order (ADR 0055). */
const translationsValidator = v.array(
	v.array(
		v.object({
			kind: literalUnion(translationPieceKindValues),
			text: v.string(),
		}),
	),
);

const readingValueReadingValidator = v.object({
	unitKind: v.literal("Reading"),
	lemma: readingValueLemmaValidator,
	/** A Foreign Reading has none (ADR 0045). */
	emojiDescription: v.optional(v.string()),
});

export const governedCaseValidator = v.union(
	v.literal("Acc"),
	v.literal("Dat"),
	v.literal("Gen"),
);

type GermanComplement<Kind extends Dumrel.GermanValencyComplement["kind"]> =
	Extract<Dumrel.GermanValencyComplement, { kind: Kind }>;

const adverbialStandInValues = [
	"Irgendwo",
	"Irgendwohin",
	"Irgendwie",
	"IrgendwieLange",
	"IrgendwieViel",
] as const satisfies readonly GermanComplement<"Adverbial">["standIn"][];
const predicativeMarkerValues = [
	"None",
	"Als",
	"Für",
] as const satisfies readonly GermanComplement<"Predicative">["marker"][];
const clauseFormValues = [
	"ZuInfinitive",
	"BareInfinitive",
	"Dass",
	"Ob",
	"W",
] as const satisfies readonly GermanComplement<"Clause">["form"][];

/**
 * One concrete Valency Pattern realized by an occurrence of a Reading
 * (ADR 0034): a flat array of concrete complements, with no optionality
 * statuses and no inline alternatives. German complements are marked by case,
 * or are an Adverbial, Predicative, Clause (with optional `da(r)-` correlate
 * preposition), or Reflexive; Hebrew and English ones are marked by function
 * or position and preposition.
 */
export const valencyPatternValidator = v.array(
	v.union(
		v.object({
			kind: v.literal("Case"),
			governedCase: v.union(v.literal("Nom"), governedCaseValidator),
		}),
		v.object({
			kind: v.literal("Preposition"),
			preposition: readingValueLemmaValidator,
			governedCase: governedCaseValidator,
		}),
		v.object({
			kind: v.literal("Adverbial"),
			standIn: literalUnion(adverbialStandInValues),
		}),
		v.object({
			kind: v.literal("Predicative"),
			marker: literalUnion(predicativeMarkerValues),
		}),
		v.object({
			kind: v.literal("Clause"),
			form: literalUnion(clauseFormValues),
			preposition: v.optional(readingValueLemmaValidator),
		}),
		// A lexical reflexive: German names its case, English none, and
		// one inside a fixed phrase its preposition (ADR 0052).
		v.object({
			kind: v.literal("Reflexive"),
			governedCase: v.optional(
				v.union(v.literal("Acc"), v.literal("Dat")),
			),
			preposition: v.optional(readingValueLemmaValidator),
		}),
		v.object({
			kind: v.union(
				v.literal("Subject"),
				v.literal("DirectObject"),
				v.literal("IndirectObject"),
			),
		}),
		v.object({
			kind: v.literal("Preposition"),
			preposition: readingValueLemmaValidator,
		}),
	),
);

/**
 * A Reading's Knowledge as the Reading Note returns it; Dumrel's parse has
 * already checked every aspect.
 */
export const readingKnowledgeValidator = v.object({
	transcription: v.optional(v.string()),
	hebrewParadigm: v.optional(
		v.object({
			forms: v.array(
				v.object({
					form: v.string(),
					features: v.object({
						gender: v.optional(literalUnion(["Masc", "Fem"])),
						number: v.optional(
							literalUnion(["Sing", "Plur", "Dual"]),
						),
						person: v.optional(literalUnion(["1", "2", "3"])),
						tense: v.optional(literalUnion(["Past", "Fut"])),
						verbForm: v.optional(literalUnion(["Inf", "Part"])),
						mood: v.optional(v.literal("Imp")),
						definite: v.optional(
							literalUnion(["Ind", "Def", "Cons"]),
						),
						voice: v.optional(literalUnion(["Act", "Mid", "Pass"])),
						polarity: v.optional(literalUnion(["Pos", "Neg"])),
					}),
				}),
			),
		}),
	),
	definition: v.optional(v.string()),
	translations: v.optional(
		v.object({
			en: v.optional(translationsValidator),
			ru: v.optional(translationsValidator),
		}),
	),
	breakdown: v.optional(
		v.object({
			constituents: v.optional(breakdownPiecesValidator),
			morphemes: v.optional(breakdownPiecesValidator),
		}),
	),
	valency: v.optional(v.array(valencyPatternValidator)),
	source: v.optional(
		v.object({
			target: linkTargetValidator,
			meaning: v.optional(participleMeaningValidator),
		}),
	),
	// The per-Reading aspects of ADR 0039, which Knowledge production writes
	// (#887); Dumrel's parse has already checked them.
	locutionType: v.optional(literalUnion(locutionTypeValues)),
	sayingType: v.optional(
		v.object({
			type: literalUnion(sayingTypeValues),
			attribution: v.optional(v.string()),
		}),
	),
	formulaRole: v.optional(literalUnion(formulaRoleValues)),
	semanticRelations: v.optional(
		v.union(
			v.object({
				targetKind: v.optional(v.literal("lemma")),
				synonym: v.optional(v.array(readingValueLemmaValidator)),
				nearSynonym: v.optional(v.array(readingValueLemmaValidator)),
				antonym: v.optional(v.array(readingValueLemmaValidator)),
				nearAntonym: v.optional(v.array(readingValueLemmaValidator)),
				hypernym: v.optional(v.array(readingValueLemmaValidator)),
				hyponym: v.optional(v.array(readingValueLemmaValidator)),
				meronym: v.optional(v.array(readingValueLemmaValidator)),
				holonym: v.optional(v.array(readingValueLemmaValidator)),
				endonym: v.optional(v.array(readingValueLemmaValidator)),
				exonym: v.optional(v.array(readingValueLemmaValidator)),
			}),
			v.object({
				targetKind: v.literal("reading"),
				synonym: v.optional(v.array(readingValueReadingValidator)),
				nearSynonym: v.optional(v.array(readingValueReadingValidator)),
				antonym: v.optional(v.array(readingValueReadingValidator)),
				nearAntonym: v.optional(v.array(readingValueReadingValidator)),
				hypernym: v.optional(v.array(readingValueReadingValidator)),
				hyponym: v.optional(v.array(readingValueReadingValidator)),
				meronym: v.optional(v.array(readingValueReadingValidator)),
				holonym: v.optional(v.array(readingValueReadingValidator)),
				endonym: v.optional(v.array(readingValueReadingValidator)),
				exonym: v.optional(v.array(readingValueReadingValidator)),
			}),
		),
	),
});
