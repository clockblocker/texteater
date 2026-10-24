import type { KnowledgePolicy } from "./knowledge-policies.js";
import type { KnowledgeRequestMask } from "./types.js";

type SemanticRelation = keyof NonNullable<
	KnowledgeRequestMask["semanticRelations"]
>;

const select = (
	...relations: readonly SemanticRelation[]
): readonly SemanticRelation[] => relations;

/** Routes whose Readings own a Valency Frame (`valency-policy.ts`): `warten auf`, `stolz auf`, `Angst vor`, `Bescheid wissen über`. */
const framed = { valency: null } as const;
/**
 * A single word that may be formed whole from another names it as Source
 * (ADR 0050): a participle (`gekocht` from `kochen`, ADR 0036), a
 * conversion (`Lauf` from `laufen`), a clipping (`Uni`) or an acronym
 * (`Kita`). Dumgen's `source` stage answers none for a multiword Lexeme.
 */
const formed = { ...framed, source: null } as const;

/** A routine formula records what it does in conversation (ADR 0039). */
const formula = { formulaRole: null } as const;
/** A Locution records whether it is an Idiom or a Collocation, if either (ADR 0039). */
const locution = { locutionType: null } as const;

function request(
	relations: readonly SemanticRelation[],
	extra: Pick<
		KnowledgeRequestMask,
		"valency" | "source" | "locutionType" | "sayingType" | "formulaRole"
	> = {},
): KnowledgeRequestMask {
	const base = {
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
		...extra,
	} as const;
	if (relations.length === 0) return base;
	return {
		...base,
		semanticRelations: Object.fromEntries(
			relations.map((relation) => [relation, null]),
		),
	};
}

const makeDeRelMap = () =>
	({
		Lexeme: {
			ADJ: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				formed,
			),
			ADP: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			ADV: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			AUX: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			CCONJ: request(select("synonym", "antonym", "nearAntonym")),
			DET: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			INTJ: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				formula,
			),
			NOUN: request(
				select(
					"synonym",
					"nearSynonym",
					"antonym",
					"nearAntonym",
					"hypernym",
					"holonym",
				),
				formed,
			),
			NUM: request(select("synonym")),
			PART: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			PRON: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			// Only a proper noun names a place's local name (`Pressburg`:
			// `Bratislava`); the local name's exonym is projected.
			PROPN: request(select("synonym", "hypernym", "holonym", "endonym")),
			PUNCT: request(select()),
			SCONJ: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			SYM: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			VERB: request(
				select(
					"synonym",
					"nearSynonym",
					"antonym",
					"nearAntonym",
					"hypernym",
				),
				formed,
			),
		},
		// A Locution route requests what the Lexeme route with its Kind does,
		// with a frame where that route has one, and its Locution Type (ADR
		// 0039). A Locution INTJ also records its Formula Role.
		Locution: {
			ADJ: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				{
					...framed,
					...locution,
				},
			),
			ADP: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				locution,
			),
			ADV: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				locution,
			),
			CCONJ: request(
				select("synonym", "antonym", "nearAntonym"),
				locution,
			),
			DET: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				locution,
			),
			INTJ: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				{
					...locution,
					...formula,
				},
			),
			NOUN: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				{
					...framed,
					...locution,
				},
			),
			NUM: request(select("synonym"), locution),
			PRON: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				locution,
			),
			SCONJ: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				locution,
			),
			VERB: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				{
					...framed,
					...locution,
				},
			),
		},
		// A Saying relates only to Sayings and records its Saying Type.
		Saying: {
			Saying: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				{ sayingType: null },
			),
		},
		// A Foreign unit has one Reading, and all its senses go into its
		// translations; a translation into its source language is a gloss
		// (`tbh`: "to be honest"). It requests nothing else (ADR 0045).
		Foreign: {
			Foreign: { translations: { en: null, ru: null } },
		},
		Morpheme: {
			Circumfix: request(select()),
			Duplifix: request(select()),
			Ending: request(select()),
			Infix: request(select()),
			Interfix: request(select()),
			Prefix: request(select()),
			Root: request(select()),
			Suffix: request(select()),
			Suffixoid: request(select()),
		},
	}) satisfies KnowledgePolicy<"de">;

/** Fully materialized German policy; no runtime inheritance remains. */
export const DE_REL_MAP = makeDeRelMap();
