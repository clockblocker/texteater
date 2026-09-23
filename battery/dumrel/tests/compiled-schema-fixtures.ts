import {
	aufLemma,
	houseLemma,
	houseReading,
	prefixLemma,
	wartenReading,
} from "./fixtures";

const shadow = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Haus",
};
export const samples: Record<string, unknown[]> = {
	readingKnowledge: [
		{},
		{ definition: "  Geba\u0308ude  ", translations: { en: [" house "] } },
		{ semanticRelations: { synonym: [houseLemma] } },
		{ governedPrepositions: [{ preposition: aufLemma, case: "Acc" }] },
		{
			semanticRelations: {
				targetKind: "reading",
				synonym: [houseReading],
			},
		},
		{
			morphologicalTree: {
				root: {
					nodeKind: "structure",
					children: [
						{
							nodeKind: "morphemeReading",
							reading: {
								unitKind: "Reading",
								lemma: prefixLemma,
								emojiDescription: "🚫",
							},
						},
					],
				},
			},
		},
	],
	knowledgeChange: [
		{ kind: "Contribute", aspect: "definition", value: " x " },
		{ kind: "Retract", aspect: "translations", language: "en" },
		{
			kind: "Correct",
			aspect: "semanticRelations",
			relation: "synonym",
			targetKind: "reading",
			value: [houseReading],
		},
		{
			kind: "Contribute",
			aspect: "governedPrepositions",
			value: [{ preposition: aufLemma, case: "Acc" }],
		},
		{ kind: "Retract", aspect: "governedPrepositions" },
	],
	governedCase: ["Acc", "Gen"],
	governedPreposition: [{ preposition: aufLemma, case: "Dat" }],
	governmentRelation: ["governs", "governedBy"],
	governmentProjection: [
		{
			source: wartenReading,
			relation: "governs",
			target: aufLemma,
			case: "Acc",
			provenance: "direct",
		},
	],
	knowledgeSettings: [
		{},
		{ definition: false, semanticRelations: { synonym: true } },
	],
	knowledgeRequestMask: [{}, { translations: { en: null } }],
	knowledgeSelectionInput: [
		{
			route: { language: "de", family: "Lexeme", kind: "NOUN" },
			settings: { definition: false },
		},
	],
	pendingSemanticRelation: [{ relation: "nearSynonym", target: shadow }],
	unitShadow: [shadow],
	lexicalBreakdown: [[shadow, shadow]],
	morphologicalTree: [
		{
			root: {
				nodeKind: "structure",
				children: [{ nodeKind: "unitShadow", unitShadow: shadow }],
			},
		},
	],
	semanticRelations: [
		{ targetKind: "reading", synonym: [houseReading] },
		{ hypernym: [houseLemma] },
	],
	semanticProjectionInput: [
		[{ reading: houseReading, knowledge: { definition: " home " } }],
	],
	semanticRelationProjection: [
		{
			source: houseReading,
			relation: "hyponym",
			target: houseLemma,
			provenance: "inferred",
		},
	],
	directSemanticRelation: ["synonym", "holonym"],
	semanticRelation: ["hyponym", "meronym"],
	translationLanguage: ["en", "ru"],
};
