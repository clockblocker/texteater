import type { GoldenCaseRegistry } from "../../../../assembly";
import { defineGoldenCaseCollection } from "../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const cases = {
	"unit-shadow-demo-de-noun": {
		input: {
			language: "de",
			canonicalForm: "Fahrzeug",
			intendedUse: "The general thing that a car is a type of.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "NOUN" },
		},
		explanation:
			"Fahrzeug names a word-like nominal target. Do not infer any Core Features.",
	},
	"unit-shadow-demo-en-permit-verb": {
		input: {
			language: "en",
			canonicalForm: "permit",
			intendedUse: "To allow an action to happen.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "VERB" },
		},
		explanation:
			"The intended predicative use disambiguates the homograph as VERB rather than its nominal use.",
	},
	"unit-shadow-demo-he-adposition": {
		input: {
			language: "he",
			canonicalForm: "ליד",
			intendedUse: "Marks that one place is next to another place.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "ADP" },
		},
	},
	"unit-shadow-demo-de-idiom": {
		input: {
			language: "de",
			canonicalForm: "ins Gras beißen",
			intendedUse: "An established figurative expression meaning to die.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "Idiom" },
		},
	},
	"unit-shadow-demo-de-collocation": {
		input: {
			language: "de",
			canonicalForm: "eine Entscheidung treffen",
			intendedUse:
				"The conventional support-verb expression synonymous with entscheiden; its overall meaning remains compositional.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "Collocation" },
		},
	},
	"unit-shadow-demo-en-discourse-formula": {
		input: {
			language: "en",
			canonicalForm: "thank you",
			intendedUse:
				"The conventional utterance used to express gratitude.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "DiscourseFormula" },
		},
	},
	"unit-shadow-demo-de-prefix": {
		input: {
			language: "de",
			canonicalForm: "un-",
			intendedUse:
				"The bound negative element at the left edge of words such as unklar.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Prefix" },
		},
	},
	"unit-shadow-demo-he-root": {
		input: {
			language: "he",
			canonicalForm: "כ־ת־ב",
			intendedUse:
				"The discontinuous consonantal lexical base shared by כתב, מכתב, and כתיבה.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Root" },
		},
	},
	"unit-shadow-demo-en-correlative": {
		input: {
			language: "en",
			canonicalForm: "the more … the more …",
			intendedUse:
				"The fixed correlating anchors of the comparative-correlative lexical identity, with open comparative slots.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "CCONJ" },
		},
	},
	"unit-shadow-demo-unresolved-homograph": {
		input: {
			language: "en",
			canonicalForm: "seal",
			intendedUse: "A related target called seal.",
		},
		idealOutput: { decision: "Unresolved", target: null },
		explanation:
			"The evidence does not choose the nominal or verbal homograph. Plausibility is not exact classification.",
	},
	"unit-shadow-demo-unresolved-free-phrase": {
		input: {
			language: "en",
			canonicalForm: "walk quickly",
			intendedUse:
				"A freshly composed paraphrase of sprint, with no claim that the wording is conventionalized.",
		},
		idealOutput: { decision: "Unresolved", target: null },
		explanation:
			"A semantically useful free phrase is not thereby a Phraseme Lemma.",
	},
	"unit-shadow-demo-unresolved-conflict": {
		input: {
			language: "de",
			canonicalForm: "-heit",
			intendedUse:
				"Proposed both as the bound ending in Freiheit and as a standalone adjective; no source resolves the conflict.",
		},
		idealOutput: { decision: "Unresolved", target: null },
		explanation:
			"Conflicting evidence must not be converted into an exact Family and Kind.",
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>;

export const demonstrationCases = defineGoldenCaseCollection(import.meta.url, {
	cases,
});
