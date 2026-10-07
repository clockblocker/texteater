import type { ValencyPolicy } from "../../src/valency-policy.js";

const valid = {
	de: { Lexeme: { VERB: ["Case"] }, Locution: { NOUN: ["Preposition"] } },
	he: { Lexeme: { NOUN: ["Preposition"] } },
	en: {},
} satisfies ValencyPolicy;

const misspelledKind = {
	de: {
		Locution: {
			// @ts-expect-error VREB is no German Locution Kind.
			VREB: ["Case"],
		},
	},
	he: {},
	en: {},
} satisfies ValencyPolicy;

const misspelledFamily = {
	de: {
		// @ts-expect-error Lexem is no Family.
		Lexem: { VERB: ["Case"] },
	},
	he: {},
	en: {},
} satisfies ValencyPolicy;

const missingRoute = {
	de: {},
	he: {
		// @ts-expect-error Hebrew has no Locution VERB route.
		Locution: { VERB: ["Preposition"] },
	},
	en: {},
} satisfies ValencyPolicy;

const foreignComplement = {
	de: {},
	he: {},
	// @ts-expect-error Case is a German complement, not an English one.
	en: { Lexeme: { VERB: ["Case"] } },
} satisfies ValencyPolicy;

void [valid, misspelledKind, misspelledFamily, missingRoute, foreignComplement];
