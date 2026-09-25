import type { KnowledgeRequestMask } from "./types.js";

type SemanticRelation = keyof NonNullable<
	KnowledgeRequestMask["semanticRelations"]
>;

const select = (
	...relations: readonly SemanticRelation[]
): readonly SemanticRelation[] => relations;

/** Routes whose Readings own a Valency Frame (`valency-policy.ts`): `warten auf`, `stolz auf`, `Angst vor`, `Bescheid wissen über`. */
const framed = { valency: null } as const;
/** An adjectival participle names its source verb: `gekocht` from `kochen` (ADR 0035). */
const participial = { ...framed, participleSource: null } as const;

function request(
	relations: readonly SemanticRelation[],
	extra: Pick<KnowledgeRequestMask, "valency" | "participleSource"> = {},
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
				participial,
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
				framed,
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
				framed,
			),
			X: request(select()),
		},
		Phraseme: {
			Aphorism: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			Collocation: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				framed,
			),
			DiscourseFormula: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
			),
			Idiom: request(
				select("synonym", "nearSynonym", "antonym", "nearAntonym"),
				framed,
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
	}) satisfies Record<string, Record<string, KnowledgeRequestMask>>;

/** Fully materialized German policy; no runtime inheritance remains. */
export const DE_REL_MAP = makeDeRelMap();
