/** The German noun and verb Surfaces the composition tests vary. */
export const noun = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "Haus",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Haus",
		coreFeatures: { gender: "Neut" },
	},
	inflectionalFeatures: { case: "Dat", gender: null, number: "Sing" },
} as const;
export const verb = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "es gibt",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "geben",
		coreFeatures: {
			hasSepPrefix: null,
		},
	},
	inflectionalFeatures: {
		verbForm: "Fin",
		tense: "Pres",
		mood: "Ind",
		person: "3",
		number: "Sing",
		expletive: "Subject",
		perfect: null,
		future: null,
		passive: null,
		voice: null,
	},
} as const;
