import type { KnowledgePolicy } from "../../src/knowledge-policies.js";

const mask = { definition: null } as const;

const valid = {
	Lexeme: { VERB: mask, NOUN: mask },
	Morpheme: { Prefix: mask },
} satisfies KnowledgePolicy<"de">;

const misspelledKind = {
	Lexeme: {
		// @ts-expect-error VREB is no German Lexeme Kind.
		VREB: mask,
	},
} satisfies KnowledgePolicy<"de">;

const misspelledFamily = {
	// @ts-expect-error Morphem is no Family.
	Morphem: { Prefix: mask },
} satisfies KnowledgePolicy<"de">;

const wrongFamilyKind = {
	Lexeme: {
		// @ts-expect-error Prefix is a Morpheme Kind, not a Lexeme Kind.
		Prefix: mask,
	},
} satisfies KnowledgePolicy<"de">;

void [valid, misspelledKind, misspelledFamily, wrongFamilyKind];
