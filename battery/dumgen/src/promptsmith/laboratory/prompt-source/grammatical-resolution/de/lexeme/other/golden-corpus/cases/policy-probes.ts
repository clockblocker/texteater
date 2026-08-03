import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { unresolved } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-x-provisional-hyph-drive-in": {
			input: {
				markedContext:
					"Das <TARGET>Drive-in</TARGET> schließt um Mitternacht.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only Hyph ownership probe: the established loan has German NOUN syntax and must not become X merely because the X codec can represent Hyph=Yes.",
			contaminationKeys: ["de-x-policy:hyph-drive-in"],
		},
		"grammar-de-x-provisional-abbr-og": {
			input: {
				markedContext:
					"Nichtdeutsche Abkürzung im deutschen Satz: <TARGET>og</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only Abbr ownership probe: GSD attests X og with Abbr=Yes, but current non-primary-language material remains OpaqueText and cannot reach German X.",
			contaminationKeys: ["de-x-policy:abbr-og"],
		},
		"grammar-de-x-provisional-numtype-s8": {
			input: {
				markedContext:
					"Undurchsichtiger alphanumerischer Code: <TARGET>S8</TARGET>",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only NumType probe: GSD can attach NumType=Card to X-shaped codes, but the adopted policy keeps non-word opaque codes outside Lexeme/X despite codec support.",
			contaminationKeys: ["de-x-policy:numtype-code"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
