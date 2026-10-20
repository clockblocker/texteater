import { v } from "convex/values";
import {
	formulaRoleValues,
	locutionTypeValues,
	sayingTypeValues,
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

const readingValueReadingValidator = v.object({
	unitKind: v.literal("Reading"),
	lemma: readingValueLemmaValidator,
	/** A Foreign Reading has none (ADR 0045). */
	emojiDescription: v.optional(v.string()),
});

const valencyReferentValidator = v.union(
	v.literal("Someone"),
	v.literal("Something"),
	v.literal("Either"),
);
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
const predicativeOfValues = [
	"Subject",
	"Object",
] as const satisfies readonly GermanComplement<"Predicative">["of"][];
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
const clauseCorrelateValues = [
	"Required",
	"Optional",
] as const satisfies readonly NonNullable<
	GermanComplement<"Clause">["correlate"]
>[];

/**
 * A Valency Frame Slot, as the Valency Block reads it: its status and its
 * alternatives (ADR 0034). German complements are marked by case, or are an
 * Adverbial, Predicative or Clause with no referent; Hebrew and English ones
 * are marked by function or position and preposition.
 */
const valencySlotValidator = v.object({
	status: v.union(v.literal("Required"), v.literal("Optional")),
	complements: v.array(
		v.union(
			v.object({
				kind: v.literal("Case"),
				governedCase: v.union(v.literal("Nom"), governedCaseValidator),
				referent: valencyReferentValidator,
			}),
			v.object({
				kind: v.literal("Preposition"),
				preposition: readingValueLemmaValidator,
				governedCase: governedCaseValidator,
				referent: valencyReferentValidator,
			}),
			v.object({
				kind: v.literal("Adverbial"),
				standIn: literalUnion(adverbialStandInValues),
			}),
			v.object({
				kind: v.literal("Predicative"),
				of: literalUnion(predicativeOfValues),
				marker: literalUnion(predicativeMarkerValues),
			}),
			v.object({
				kind: v.literal("Clause"),
				form: literalUnion(clauseFormValues),
				correlate: v.optional(literalUnion(clauseCorrelateValues)),
			}),
			v.object({
				kind: v.union(
					v.literal("Subject"),
					v.literal("DirectObject"),
					v.literal("IndirectObject"),
				),
				referent: valencyReferentValidator,
			}),
			v.object({
				kind: v.literal("Preposition"),
				preposition: readingValueLemmaValidator,
				referent: valencyReferentValidator,
			}),
		),
	),
});

/**
 * A Reading's Knowledge as the Reading Note returns it; Dumrel's parse has
 * already checked every aspect.
 */
export const readingKnowledgeValidator = v.object({
	transcription: v.optional(v.string()),
	definition: v.optional(v.string()),
	translations: v.optional(
		v.object({
			en: v.optional(v.array(v.string())),
			ru: v.optional(v.array(v.string())),
		}),
	),
	morphologicalTree: v.optional(v.any()),
	valency: v.optional(v.array(valencySlotValidator)),
	participleSource: v.optional(
		v.object({
			verb: readingValueLemmaValidator,
			meaning: participleMeaningValidator,
		}),
	),
	// The per-Reading aspects of ADR 0038 and 0039, which Knowledge
	// production writes (#887); Dumrel's parse has already checked them.
	plural: v.optional(
		v.union(v.array(v.string()), literalUnion(["NoPlural", "PluralOnly"])),
	),
	conjugationClass: v.optional(
		v.array(literalUnion(["Strong", "Weak", "Mixed"])),
	),
	preterite: v.optional(v.array(v.string())),
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
