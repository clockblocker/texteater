import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, inflection, unresolved } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-propn-provisional-numeric-name-ii": {
			input: {
				markedContext:
					"König Heinrich <TARGET>II</TARGET> regierte lange.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only: German GSD routes the Roman name component to PROPN with NumType=Card, but the German PROPN codec cannot represent NumType or a non-empty contextual inflection here.",
		},
		"grammar-de-propn-provisional-organization-spd-gender": {
			input: { markedContext: "Die <TARGET>SPD</TARGET> berät heute." },
			idealOutput: inflection({
				normalizedMembers: ["SPD"],
				case: "Nom",
				number: "Sing",
				coreFeatures: { abbr: null, foreign: null, gender: "Fem" },
			}),
			explanation:
				"Corpus-only: the article establishes feminine agreement, but whether SPD's lexical organization identity independently establishes Gender and Abbr remains unsettled; neither feature follows from all-caps shape alone.",
		},
		"grammar-de-propn-provisional-foreign-new": {
			input: { markedContext: "Namensbestandteil: <TARGET>New</TARGET>" },
			idealOutput: citation({
				normalizedMembers: ["New"],
				coreFeatures: { abbr: null, foreign: "Yes", gender: null },
			}),
			explanation:
				"Corpus-only: a genuinely foreign component inside an English name may carry Foreign=Yes, while an established German loan or name does not; treebank Foreign is token-local but Dumling makes it stable Lemma identity.",
		},
		"grammar-de-propn-provisional-abbreviation-chr": {
			input: { markedContext: "Abgekürzter Name: <TARGET>Chr.</TARGET>" },
			idealOutput: citation({
				normalizedMembers: ["Chr."],
				canonicalForm: "Christus",
				coreFeatures: { abbr: "Yes", foreign: null, gender: "Masc" },
				spelling: "Variant",
			}),
			explanation:
				"Corpus-only: abbreviation punctuation, canonical expansion, and stable Abbr identity require an explicit route policy.",
		},
		"grammar-de-propn-provisional-stylized-brand-adidas": {
			input: { markedContext: "Markenname: <TARGET>adidas</TARGET>" },
			idealOutput: citation({
				normalizedMembers: ["adidas"],
				coreFeatures: { abbr: null, foreign: null, gender: null },
			}),
			explanation:
				"Corpus-only: registered lowercase styling must not be repaired merely because ordinary proper names are capitalized.",
		},
		"grammar-de-propn-provisional-pluralized-surname-schmidts": {
			input: {
				markedContext:
					"Die beiden <TARGET>Schmidts</TARGET> wohnen nebenan.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only: productive pluralization can recategorize a surname as a common noun; route ownership must be settled before scoring.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
