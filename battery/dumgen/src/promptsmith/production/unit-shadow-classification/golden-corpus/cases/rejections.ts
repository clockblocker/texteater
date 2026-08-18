import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const cases = {
	"unit-shadow-unresolved-en-bank": {
		input: {
			language: "en",
			canonicalForm: "bank",
			intendedUse:
				"A semantically related target with this spelling; no grammatical use or conventional expression is identified.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-he-sefer": {
		input: {
			language: "he",
			canonicalForm: "ספר",
			intendedUse:
				"A proposed target preserved without pointing or any statement of its nominal or verbal use.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-free-noun-phrase": {
		input: {
			language: "en",
			canonicalForm: "red bicycle",
			intendedUse:
				"A bicycle that happens to be red; the wording is freely composed and no conventionalized unit is claimed.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-free-verb-phrase": {
		input: {
			language: "de",
			canonicalForm: "sehr schnell gehen",
			intendedUse:
				"A newly composed descriptive paraphrase of eilen, not an established multiword unit.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-plausible-nonce-word": {
		input: {
			language: "de",
			canonicalForm: "Glorf",
			intendedUse:
				"A plausible invented target said to concern motion, without evidence of a grammatical category.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-incomplete-idiom": {
		input: {
			language: "en",
			canonicalForm: "the bucket",
			intendedUse:
				"Proposed as the target meaning die only because it occurs inside kick the bucket; no independent unit with that meaning is established.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-prefix-versus-word": {
		input: {
			language: "en",
			canonicalForm: "down",
			intendedUse:
				"Proposed alternately as a standalone direction word and as a bound element, with no evidence choosing either analysis.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-proverb-versus-aphorism": {
		input: {
			language: "de",
			canonicalForm: "Wissen ist Macht",
			intendedUse:
				"A saying supplied without evidence whether the intended unit is an attributed authored maxim or a traditional proverb.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-pattern-fragment": {
		input: {
			language: "de",
			canonicalForm: "desto",
			intendedUse:
				"A fragment extracted from je … desto … and proposed as the whole multi-member Lexeme/CCONJ.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-unresolved-translation-only": {
		input: {
			language: "he",
			canonicalForm: "על",
			intendedUse:
				"The proposer supplies only the English gloss on, with no defensible choice among its grammatical uses.",
		},
		idealOutput: { decision: "Unresolved", target: null },
	},
	"unit-shadow-en-kindergarten-noun-not-phrase": {
		input: {
			language: "en",
			canonicalForm: "kindergarten",
			intendedUse:
				"The single conventional word naming a preschool, despite its historically transparent components.",
		},
		idealOutput: {
			decision: "Resolved",
			target: { family: "Lexeme", kind: "NOUN" },
		},
	},
	"unit-shadow-en-down-adverb-not-prefix": {
		input: {
			language: "en",
			canonicalForm: "down",
			intendedUse: "The standalone directional modifier in sit down.",
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

export const rejectionAndTrapCases = defineGoldenCaseCollection(
	import.meta.url,
	{ cases },
);
