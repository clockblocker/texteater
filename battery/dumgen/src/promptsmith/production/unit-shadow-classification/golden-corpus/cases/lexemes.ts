import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const cases = {
	"unit-shadow-de-adjective": {
		input: {
			language: "de",
			canonicalForm: "ruhig",
			intendedUse:
				"Describes a person as calm rather than acting calmly.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "ADJ" },
		},
	},
	"unit-shadow-en-to-adposition": {
		input: {
			language: "en",
			canonicalForm: "to",
			intendedUse:
				"Marks the relation to a nominal destination, as in to Berlin.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "ADP" },
		},
	},
	"unit-shadow-he-adverb": {
		input: {
			language: "he",
			canonicalForm: "מהר",
			intendedUse: "Modifies an action by saying it happens quickly.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "ADV" },
		},
	},
	"unit-shadow-en-auxiliary": {
		input: {
			language: "en",
			canonicalForm: "have",
			intendedUse: "The perfect auxiliary as in they have finished.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "AUX" },
		},
	},
	"unit-shadow-he-coordinating-conjunction": {
		input: {
			language: "he",
			canonicalForm: "אבל",
			intendedUse:
				"Coordinates two contrasting clauses with the sense but.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "CCONJ" },
		},
	},
	"unit-shadow-en-that-determiner": {
		input: {
			language: "en",
			canonicalForm: "that",
			intendedUse:
				"Modifies a noun as the demonstrative in that soldier.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "DET" },
		},
	},
	"unit-shadow-en-interjection": {
		input: {
			language: "en",
			canonicalForm: "ouch",
			intendedUse: "A standalone exclamation of sudden pain.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "INTJ" },
		},
	},
	"unit-shadow-he-yesh-verb": {
		input: {
			language: "he",
			canonicalForm: "יש",
			intendedUse:
				"The existential predicate meaning there is or there are.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "VERB" },
		},
	},
	"unit-shadow-en-numeral": {
		input: {
			language: "en",
			canonicalForm: "twelve",
			intendedUse: "Expresses the cardinal number 12.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "NUM" },
		},
	},
	"unit-shadow-en-to-particle": {
		input: {
			language: "en",
			canonicalForm: "to",
			intendedUse: "The infinitive marker before a verb, as in to come.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "PART" },
		},
	},
	"unit-shadow-en-that-pronoun": {
		input: {
			language: "en",
			canonicalForm: "that",
			intendedUse:
				"Replaces a noun phrase as the demonstrative in that is okay.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "PRON" },
		},
	},
	"unit-shadow-de-proper-noun": {
		input: {
			language: "de",
			canonicalForm: "Berlin",
			intendedUse: "The name of Germany's capital city.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "PROPN" },
		},
	},
	"unit-shadow-en-punctuation": {
		input: {
			language: "en",
			canonicalForm: ";",
			intendedUse:
				"The semicolon punctuation mark as a grammatical symbol, not a lexical meaning target.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "PUNCT" },
		},
	},
	"unit-shadow-en-that-subordinating-conjunction": {
		input: {
			language: "en",
			canonicalForm: "that",
			intendedUse:
				"Introduces a finite complement clause in I know that it works.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "SCONJ" },
		},
	},
	"unit-shadow-de-symbol": {
		input: {
			language: "de",
			canonicalForm: "€",
			intendedUse: "The conventional symbol for the euro currency.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "SYM" },
		},
	},
	"unit-shadow-de-verb": {
		input: {
			language: "de",
			canonicalForm: "laufen",
			intendedUse: "To move by running on foot.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "VERB" },
		},
	},
	"unit-shadow-en-other": {
		input: {
			language: "en",
			canonicalForm: "wug",
			intendedUse:
				"The deliberately unanalyzed nonce lexical item in a metalinguistic test; no ordinary part of speech is asserted.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "X" },
		},
	},
	"unit-shadow-en-record-noun": {
		input: {
			language: "en",
			canonicalForm: "record",
			intendedUse: "A stored account of facts or events.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "NOUN" },
		},
	},
	"unit-shadow-de-waehrend-adposition": {
		input: {
			language: "de",
			canonicalForm: "während",
			intendedUse: "Means during and governs a nominal time span.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "ADP" },
		},
	},
	"unit-shadow-de-waehrend-subordinator": {
		input: {
			language: "de",
			canonicalForm: "während",
			intendedUse:
				"Means while and introduces a subordinate finite clause.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "SCONJ" },
		},
	},
	"unit-shadow-he-yesh-adverb": {
		input: {
			language: "he",
			canonicalForm: "יש",
			intendedUse:
				"The modal use meaning it is possible or one can, rather than existential there is.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "ADV" },
		},
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>;

export const lexemeCases = defineGoldenCaseCollection(import.meta.url, {
	cases,
});
