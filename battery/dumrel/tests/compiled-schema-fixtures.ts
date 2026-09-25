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
		{
			valency: [
				{
					status: "Required",
					complement: {
						kind: "Case",
						case: "Nom",
						referent: "Someone",
					},
				},
				{
					status: "Optional",
					complement: {
						kind: "Preposition",
						preposition: aufLemma,
						case: "Acc",
						referent: "Either",
					},
				},
			],
		},
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
			aspect: "valency",
			value: [
				{
					status: "Optional",
					complement: {
						kind: "Preposition",
						preposition: aufLemma,
						case: "Acc",
						referent: "Either",
					},
				},
			],
		},
		{ kind: "Retract", aspect: "valency" },
		{
			kind: "Retract",
			aspect: "valency",
			complement: { kind: "Case", case: "Dat", referent: "Someone" },
		},
		{
			kind: "Contribute",
			aspect: "participleSource",
			value: wartenReading.lemma,
		},
		{ kind: "Retract", aspect: "participleSource" },
	],
	participleSource: [wartenReading.lemma],
	participleRelation: ["participleSource", "participialAdjective"],
	participleProjection: [
		{
			source: houseReading,
			relation: "participleSource",
			target: wartenReading.lemma,
			provenance: "direct",
		},
	],
	governedCase: ["Acc", "Gen"],
	valencySlotStatus: ["Required", "Optional"],
	valencyReferent: ["Someone", "Something", "Either"],
	valencyComplement: [
		{ kind: "Case", case: "Gen", referent: "Something" },
		{
			kind: "Preposition",
			preposition: aufLemma,
			case: "Dat",
			referent: "Either",
		},
	],
	valencySlot: [
		{
			status: "Optional",
			complement: {
				kind: "Preposition",
				preposition: aufLemma,
				case: "Acc",
				referent: "Either",
			},
		},
	],
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
	lexemeUnitShadow: [shadow],
	lexicalBreakdown: [[shadow, shadow]],
	morphologicalTreeNode: [{ nodeKind: "unitShadow", unitShadow: shadow }],
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
