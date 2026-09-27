import {
	alLemma,
	aufLemma,
	houseLemma,
	houseReading,
	onLemma,
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
		{ pluralPattern: ["UmlautE", "En"] },
		{ pluralPattern: "NoPlural" },
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
			value: { verb: wartenReading.lemma, meaning: "Drifted" },
		},
		{ kind: "Retract", aspect: "participleSource" },
		{ kind: "Contribute", aspect: "pluralPattern", value: ["En", "S"] },
		{ kind: "Correct", aspect: "pluralPattern", value: "PluralOnly" },
		{ kind: "Retract", aspect: "pluralPattern" },
	],
	pluralPattern: ["NoEnding", "UmlautEr", "Other"],
	nounPlural: [["UmlautOnly"], ["En", "S"], "NoPlural", "PluralOnly"],
	participleMeaning: ["Verbal", "Drifted"],
	participleSource: [{ verb: wartenReading.lemma, meaning: "Verbal" }],
	participleRelation: ["participleSource", "participialAdjective"],
	participleProjection: [
		{
			source: houseReading,
			relation: "participleSource",
			target: wartenReading.lemma,
			meaning: "Verbal",
			provenance: "direct",
		},
		{
			source: wartenReading.lemma,
			relation: "participialAdjective",
			target: houseReading,
			provenance: "inferred",
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
		{ kind: "Subject", referent: "Someone" },
		{ kind: "Preposition", preposition: alLemma, referent: "Either" },
		// Each language's Preposition keeps to its own ADP Lemmas.
		{
			kind: "Preposition",
			preposition: alLemma,
			case: "Acc",
			referent: "Either",
		},
		{ kind: "Preposition", preposition: aufLemma, referent: "Either" },
		{ kind: "IndirectObject", referent: "Someone" },
		{ kind: "Preposition", preposition: onLemma, referent: "Something" },
		{
			kind: "Preposition",
			preposition: onLemma,
			case: "Acc",
			referent: "Something",
		},
	],
	germanValencyComplement: [
		{ kind: "Case", case: "Nom", referent: "Someone" },
		{ kind: "Subject", referent: "Someone" },
	],
	hebrewValencyComplement: [
		{ kind: "DirectObject", referent: "Something" },
		{ kind: "Preposition", preposition: alLemma, referent: "Someone" },
		{ kind: "Case", case: "Nom", referent: "Someone" },
		{ kind: "IndirectObject", referent: "Someone" },
	],
	englishValencyComplement: [
		{ kind: "IndirectObject", referent: "Someone" },
		{ kind: "Preposition", preposition: onLemma, referent: "Something" },
		{ kind: "Preposition", preposition: alLemma, referent: "Someone" },
		{ kind: "Case", case: "Dat", referent: "Someone" },
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
		{
			source: wartenReading,
			relation: "governs",
			target: alLemma,
			case: null,
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
