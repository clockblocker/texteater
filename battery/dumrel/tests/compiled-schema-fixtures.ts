import {
	alLemma,
	aufLemma,
	berlinLemma,
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
		{ plural: ["Bänke", "Banken"] },
		{ plural: "NoPlural" },
		{ conjugationClass: ["Weak", "Mixed"] },
		{ locutionType: "Idiom" },
		{ sayingType: { type: "WingedWord", attribution: "  Shakespeare " } },
		{ sayingType: { type: "Proverb" } },
		{ formulaRole: "Sympathy" },
		{
			valency: [
				{
					status: "Required",
					complements: [
						{
							kind: "Case",
							governedCase: "Nom",
							referent: "Someone",
						},
					],
				},
				{
					status: "Optional",
					complements: [
						{
							kind: "Preposition",
							preposition: aufLemma,
							governedCase: "Acc",
							referent: "Either",
						},
						{ kind: "Clause", form: "Dass", correlate: "Required" },
					],
				},
				{
					status: "Required",
					complements: [{ kind: "Adverbial", standIn: "Irgendwo" }],
				},
			],
		},
		{ valency: [{ status: "Required", complements: [] }] },
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
					complements: [
						{
							kind: "Preposition",
							preposition: aufLemma,
							governedCase: "Acc",
							referent: "Either",
						},
					],
				},
			],
		},
		{ kind: "Retract", aspect: "valency" },
		{
			kind: "Retract",
			aspect: "valency",
			complement: {
				kind: "Case",
				governedCase: "Dat",
				referent: "Someone",
			},
		},
		{
			kind: "Retract",
			aspect: "valency",
			complement: { kind: "Predicative", of: "Object", marker: "Für" },
		},
		{
			kind: "Contribute",
			aspect: "participleSource",
			value: { verb: wartenReading.lemma, meaning: "Drifted" },
		},
		{ kind: "Retract", aspect: "participleSource" },
		{ kind: "Contribute", aspect: "plural", value: ["Pizzen", "Pizzas"] },
		{ kind: "Correct", aspect: "plural", value: "PluralOnly" },
		{ kind: "Retract", aspect: "plural" },
		{ kind: "Contribute", aspect: "conjugationClass", value: ["Weak"] },
		{ kind: "Correct", aspect: "conjugationClass", value: ["Strong"] },
		{ kind: "Retract", aspect: "conjugationClass" },
		{ kind: "Contribute", aspect: "locutionType", value: "Collocation" },
		{
			kind: "Correct",
			aspect: "sayingType",
			value: { type: "WingedWord", attribution: "Goethe" },
		},
		{ kind: "Contribute", aspect: "formulaRole", value: "Apology" },
		{ kind: "Retract", aspect: "locutionType" },
		{ kind: "Retract", aspect: "sayingType" },
		{ kind: "Retract", aspect: "formulaRole" },
	],
	pluralPattern: ["NoEnding", "UmlautEr", "Other"],
	nounPlural: [["Mütter"], ["Pizzen", "Pizzas"], "NoPlural", "PluralOnly"],
	conjugationClass: ["Strong", "Weak", "Mixed"],
	conjugationClasses: [["Strong"], ["Weak", "Mixed"]],
	locutionType: ["Idiom", "Collocation"],
	sayingType: [
		{ type: "Proverb" },
		{ type: "WingedWord", attribution: " Büchmann " },
	],
	formulaRole: ["Greeting", "Sympathy", "Transition"],
	participleMeaning: ["Verbal", "Drifted"],
	participleSource: [{ verb: wartenReading.lemma, meaning: "Verbal" }],
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
		{ kind: "Case", governedCase: "Gen", referent: "Something" },
		// The field is governedCase; the Feature Pool's case is no Knowledge field.
		{ kind: "Case", case: "Gen", referent: "Something" },
		{
			kind: "Preposition",
			preposition: aufLemma,
			governedCase: "Dat",
			referent: "Either",
		},
		{ kind: "Adverbial", standIn: "IrgendwieLange" },
		{ kind: "Adverbial", standIn: "Irgendwo", referent: "Something" },
		{ kind: "Predicative", of: "Subject", marker: "Als" },
		{ kind: "Predicative", of: "Subject", marker: "Als", case: "Nom" },
		{ kind: "Clause", form: "ZuInfinitive" },
		{ kind: "Clause", form: "Ob", correlate: "Optional" },
		{ kind: "Clause", form: "Wenn" },
		{ kind: "Subject", referent: "Someone" },
		{ kind: "Preposition", preposition: alLemma, referent: "Either" },
		// Each language's Preposition keeps to its own ADP Lemmas.
		{
			kind: "Preposition",
			preposition: alLemma,
			governedCase: "Acc",
			referent: "Either",
		},
		{ kind: "Preposition", preposition: aufLemma, referent: "Either" },
		{ kind: "IndirectObject", referent: "Someone" },
		{ kind: "Preposition", preposition: onLemma, referent: "Something" },
		{
			kind: "Preposition",
			preposition: onLemma,
			governedCase: "Acc",
			referent: "Something",
		},
	],
	germanValencyComplement: [
		{ kind: "Case", governedCase: "Nom", referent: "Someone" },
		{ kind: "Subject", referent: "Someone" },
		{ kind: "Adverbial", standIn: "IrgendwieViel" },
		{ kind: "Predicative", of: "Object", marker: "None" },
		{ kind: "Clause", form: "BareInfinitive" },
	],
	hebrewValencyComplement: [
		{ kind: "DirectObject", referent: "Something" },
		{ kind: "Preposition", preposition: alLemma, referent: "Someone" },
		{ kind: "Case", governedCase: "Nom", referent: "Someone" },
		{ kind: "IndirectObject", referent: "Someone" },
		{ kind: "Adverbial", standIn: "Irgendwo" },
	],
	englishValencyComplement: [
		{ kind: "IndirectObject", referent: "Someone" },
		{ kind: "Preposition", preposition: onLemma, referent: "Something" },
		{ kind: "Preposition", preposition: alLemma, referent: "Someone" },
		{ kind: "Case", governedCase: "Dat", referent: "Someone" },
		{ kind: "Clause", form: "Dass" },
	],
	valencySlot: [
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: aufLemma,
					governedCase: "Acc",
					referent: "Either",
				},
				{ kind: "Clause", form: "ZuInfinitive" },
			],
		},
		{ status: "Optional", complements: [] },
		{
			status: "Optional",
			complement: { kind: "Adverbial", standIn: "Irgendwohin" },
		},
	],
	governmentRelation: ["governs", "governedBy"],
	governmentProjection: [
		{
			source: wartenReading,
			relation: "governs",
			target: aufLemma,
			governedCase: "Acc",
			provenance: "direct",
		},
		{
			source: wartenReading,
			relation: "governs",
			target: alLemma,
			governedCase: null,
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
		{ endonym: [berlinLemma] },
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
	directSemanticRelation: ["synonym", "holonym", "endonym"],
	semanticRelation: ["hyponym", "meronym", "exonym"],
	translationLanguage: ["en", "ru"],
};
