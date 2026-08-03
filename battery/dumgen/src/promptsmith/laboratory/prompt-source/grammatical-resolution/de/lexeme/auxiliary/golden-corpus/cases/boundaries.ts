import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-aux-demo-unresolved-full-verb-schlaeft": {
			input: { markedContext: "Das Kind <TARGET>schläft</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"Schlafen is a lexical full verb, so the fixed Lexeme/AUX route must stay Unresolved.",
		},
		"grammar-de-aux-unresolved-full-verb-hat": {
			input: { markedContext: "Sie <TARGET>hat</TARGET> ein Fahrrad." },
			idealOutput: unresolved,
			explanation:
				"Haben with its own possession object is a full-verb use, not a perfect-forming auxiliary.",
		},
		"grammar-de-aux-unresolved-full-verb-wird": {
			input: {
				markedContext: "Das Wetter <TARGET>wird</TARGET> besser.",
			},
			idealOutput: unresolved,
			explanation:
				"Lexical werden meaning become is a full verb; it is not the future or passive auxiliary.",
		},
		"grammar-de-aux-unresolved-full-verb-mag": {
			input: { markedContext: "Sie <TARGET>mag</TARGET> Schokolade." },
			idealOutput: unresolved,
			explanation:
				"Mögen with a nominal object is a lexical full-verb use rather than a modal governing an infinitive.",
		},
		"grammar-de-aux-unresolved-overbroad-will-gehen": {
			input: { markedContext: "Sie <TARGET>will gehen</TARGET>." },
			idealOutput: unresolved,
			explanation:
				"The TARGET includes the governed lexical infinitive gehen, which is not lexical material of the auxiliary wollen.",
		},
		"grammar-de-aux-unresolved-two-unrelated-targets": {
			input: {
				markedContext:
					"Sie <TARGET>will</TARGET> gehen und er <TARGET>muss</TARGET> bleiben.",
			},
			idealOutput: unresolved,
		},
		"grammar-de-aux-unresolved-repeated-same-lemma": {
			input: {
				markedContext:
					"Sie <TARGET>ist</TARGET> gegangen und er <TARGET>ist</TARGET> geblieben.",
			},
			idealOutput: unresolved,
			explanation:
				"Each TARGET is a separate attestation even though both forms resolve to sein; this route accepts exactly one target.",
		},
		"grammar-de-aux-unresolved-particle-zu": {
			input: {
				markedContext: "Sie versucht, <TARGET>zu</TARGET> gehen.",
			},
			idealOutput: unresolved,
			explanation:
				"The infinitival marker zu belongs to the PART route, not Lexeme/AUX.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
