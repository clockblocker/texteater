import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const cases = {
	"unit-shadow-en-idiom": {
		input: {
			language: "en",
			canonicalForm: "kick the bucket",
			intendedUse:
				"The conventional non-compositional expression meaning to die.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "Idiom" },
		},
	},
	"unit-shadow-he-proverb": {
		input: {
			language: "he",
			canonicalForm: "לא דובים ולא יער",
			intendedUse:
				"The traditional complete proverb denying that the alleged thing existed at all.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "Proverb" },
		},
	},
	"unit-shadow-de-aphorism": {
		input: {
			language: "de",
			canonicalForm: "Zeit ist Geld",
			intendedUse:
				"The concise attributed maxim asserting that time has economic value, not a general traditional proverb narrative.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "Aphorism" },
		},
	},
	"unit-shadow-he-discourse-formula": {
		input: {
			language: "he",
			canonicalForm: "תודה רבה",
			intendedUse:
				"The conventional standalone formula for thanking someone warmly.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "DiscourseFormula" },
		},
	},
	"unit-shadow-de-lexical-synonym-phrase": {
		input: {
			language: "de",
			canonicalForm: "in Betracht ziehen",
			intendedUse:
				"The conventional support-verb expression used as a lexical synonym of erwägen; the meaning is compositional but the lexical choices are restricted.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Phraseme", kind: "Collocation" },
		},
		contaminationKeys: ["unit-shadow-de-erwaegen-in-betracht-ziehen"],
	},
	"unit-shadow-de-lexical-synonym-word": {
		input: {
			language: "de",
			canonicalForm: "erwägen",
			intendedUse:
				"The single-word lexical synonym of in Betracht ziehen meaning to consider.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "VERB" },
		},
		contaminationKeys: ["unit-shadow-de-erwaegen-in-betracht-ziehen"],
	},
	"unit-shadow-en-prefix": {
		input: {
			language: "en",
			canonicalForm: "un-",
			intendedUse: "The bound negative element before happy in unhappy.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Prefix" },
		},
	},
	"unit-shadow-en-suffix": {
		input: {
			language: "en",
			canonicalForm: "-ness",
			intendedUse: "The bound nominalizing ending in happiness.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Suffix" },
		},
	},
	"unit-shadow-de-interfix": {
		input: {
			language: "de",
			canonicalForm: "-s-",
			intendedUse:
				"The linking element between Arbeit and Amt in Arbeitsamt; it is neither lexical root.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Interfix" },
		},
	},
	"unit-shadow-de-circumfix": {
		input: {
			language: "de",
			canonicalForm: "ge-…-t",
			intendedUse:
				"The discontinuous bound marker surrounding the stem in a weak past participle such as gemacht.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Circumfix" },
		},
	},
	"unit-shadow-en-clitic": {
		input: {
			language: "en",
			canonicalForm: "'s",
			intendedUse:
				"The possessive element attached to the edge of a noun phrase, as in the person next door's car.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Clitic" },
		},
	},
	"unit-shadow-en-duplifix": {
		input: {
			language: "en",
			canonicalForm: "shm-",
			intendedUse:
				"The bound dismissive echo-reduplicative element in fancy-shmancy.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Duplifix" },
		},
	},
	"unit-shadow-en-suffixoid": {
		input: {
			language: "en",
			canonicalForm: "-gate",
			intendedUse:
				"The productive scandal-forming bound element in names such as Deflategate, synchronically more word-like than an ordinary suffix.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Morpheme", kind: "Suffixoid" },
		},
	},
	"unit-shadow-de-fusion": {
		input: {
			language: "de",
			canonicalForm: "am",
			intendedUse:
				"The grammatical contraction in am Bahnhof that fuses the preposition an with the article dem.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Construction", kind: "Fusion" },
		},
	},
	"unit-shadow-de-correlative-cconj": {
		input: {
			language: "de",
			canonicalForm: "je … desto …",
			intendedUse:
				"The fixed anchors of the two-part comparative-correlative lexical identity, with open comparative slots.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "CCONJ" },
		},
	},
} as const satisfies GoldenCaseRegistry<
	typeof inputSchema,
	typeof outputSchema
>;

export const nonLexemeCases = defineGoldenCaseCollection(import.meta.url, {
	cases,
});
