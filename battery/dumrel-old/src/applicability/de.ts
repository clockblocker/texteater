import type { KnowledgeRequestMask, SemanticRelation } from "../types.js";
import { deepFreeze } from "./deep-freeze.js";
import type { RelMap } from "./types.js";

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
			ADJ: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
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
			),
			NUM: request(select("synonym")),
			PART: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			PRON: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			PROPN: request(select("synonym", "hypernym", "holonym")),
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
			),
			X: request(select()),
		},
		Phraseme: {
			Aphorism: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			Collocation: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			DiscourseFormula: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			Idiom: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			Proverb: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
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
