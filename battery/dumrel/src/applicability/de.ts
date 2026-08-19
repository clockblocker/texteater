import type { KnowledgeRequestMask, SemanticRelation } from "../types.js";
import { semanticRelationValues } from "../vocabulary.js";
import { deepFreeze } from "./deep-freeze.js";
import type { RelMap } from "./types.js";

const allRelations = (): readonly SemanticRelation[] => semanticRelationValues;

const excluding = (
	...excluded: readonly SemanticRelation[]
): readonly SemanticRelation[] =>
	semanticRelationValues.filter((relation) => !excluded.includes(relation));

const select = (
	...relations: readonly SemanticRelation[]
): readonly SemanticRelation[] => relations;

function request(relations: readonly SemanticRelation[]): KnowledgeRequestMask {
	const base = {
		transcription: null,
		definition: null,
		translations: { en: null },
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
			ADJ: request(select("synonym", "nearSynonym", "antonym")),
			ADP: request(select("synonym", "nearSynonym", "antonym")),
			ADV: request(select("synonym", "nearSynonym", "antonym")),
			AUX: request(select("synonym", "nearSynonym", "antonym")),
			CCONJ: request(select("synonym", "antonym")),
			DET: request(select("synonym", "nearSynonym", "antonym")),
			INTJ: request(select("synonym", "nearSynonym", "antonym")),
			NOUN: request(allRelations()),
			NUM: request(select("synonym")),
			PART: request(select("synonym", "nearSynonym", "antonym")),
			PRON: request(select("synonym", "nearSynonym", "antonym")),
			PROPN: request(select("synonym", "meronym", "holonym")),
			PUNCT: request(select()),
			SCONJ: request(select("synonym", "nearSynonym", "antonym")),
			SYM: request(select("synonym", "nearSynonym", "antonym")),
			VERB: request(excluding("hypernym", "hyponym")),
			X: request(select()),
		},
		Phraseme: {
			Aphorism: request(select("synonym", "nearSynonym", "antonym")),
			Collocation: request(select("synonym", "nearSynonym", "antonym")),
			DiscourseFormula: request(
				select("synonym", "nearSynonym", "antonym"),
			),
			Idiom: request(select("synonym", "nearSynonym", "antonym")),
			Proverb: request(select("synonym", "nearSynonym", "antonym")),
		},
		Morpheme: {
			Circumfix: request(select()),
			Clitic: request(select()),
			Duplifix: request(select()),
			Infix: request(select()),
			Interfix: request(select()),
			Prefix: request(select()),
			Root: request(select()),
			Suffix: request(select()),
			Suffixoid: request(select()),
			ToneMarking: request(select()),
			Transfix: request(select()),
		},
		Construction: {
			Fusion: request(select()),
		},
	}) satisfies RelMap<"de">;

/** Fully materialized German policy; no runtime inheritance remains. */
export const DE_REL_MAP = deepFreeze(makeDeRelMap());
