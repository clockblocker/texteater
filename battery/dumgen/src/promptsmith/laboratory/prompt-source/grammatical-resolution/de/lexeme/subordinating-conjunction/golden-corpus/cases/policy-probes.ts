import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

const unresolved = { decision: "Unresolved", resolution: null } as const;

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sconj-provisional-multiword-so-dass": {
			input: {
				markedContext:
					"Es regnete stark, <TARGET>so dass</TARGET> die Straße gesperrt wurde.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only boundary probe: the whole multiword subordinator is not one single-word Lexeme/SCONJ target, but its eventual family ownership needs integration review.",
			contaminationKeys: ["de-sconj-policy:multiword-so-dass"],
		},
		"grammar-de-sconj-provisional-v2-weil": {
			input: {
				markedContext:
					"Ich komme später, <TARGET>weil</TARGET> ich habe noch Arbeit.",
			},
			idealOutput: resolved("weil"),
			explanation:
				"Corpus-only syntax probe: colloquial causal weil with verb-second order remains an identifiable subordinating-conjunction Lexeme, but the route boundary is not scored yet.",
			contaminationKeys: ["de-sconj-lemma:weil"],
		},
		"grammar-de-sconj-provisional-v2-obwohl": {
			input: {
				markedContext:
					"Er ging weiter, <TARGET>obwohl</TARGET> er war schon müde.",
			},
			idealOutput: resolved("obwohl"),
			explanation:
				"Corpus-only syntax probe: concessive obwohl followed by verb-second order needs a route-policy decision before scoring.",
			contaminationKeys: ["de-sconj-lemma:obwohl"],
		},
		"grammar-de-sconj-provisional-historical-dass": {
			input: {
				markedContext:
					"Historische Schreibweise: Er sagte, <TARGET>daß</TARGET> er komme.",
			},
			idealOutput: resolved("daß", "dass", "Variant"),
			explanation:
				"Corpus-only orthography probe: pre-reform daß is a licensed historical Surface variant of dass; whether the attested use also receives Archaic status needs review.",
			contaminationKeys: ["de-sconj-policy:historical-daß"],
		},
		"grammar-de-sconj-provisional-foreign-att": {
			input: {
				markedContext:
					"Im schwedischen Zitat steht: Jag vet <TARGET>att</TARGET> hon kommer.",
			},
			idealOutput: resolved("att"),
			explanation:
				"Corpus-only code-switch probe: German GSD attests foreign SCONJ att, while the German SCONJ codec cannot represent Foreign and the language boundary needs review.",
			contaminationKeys: ["de-sconj-policy:foreign-att"],
		},
		"grammar-de-sconj-provisional-gsd-typo-das": {
			input: {
				markedContext: "Ich glaube, <TARGET>das</TARGET> sie kommt.",
			},
			idealOutput: resolved("dass", "dass", "Canonical", "Typo"),
			explanation:
				"Corpus-only noisy-GSD probe: das is attested as Typo=Yes for SCONJ dass, but the form is also a valid determiner or pronoun and is not scored without stronger review.",
			contaminationKeys: ["de-sconj-policy:gsd-typo-das"],
		},
		"grammar-de-sconj-provisional-gsd-typo-den": {
			input: {
				markedContext: "Er ging, <TARGET>den</TARGET> es war spät.",
			},
			idealOutput: unresolved,
			explanation:
				"Corpus-only noisy-GSD probe: den is attested with SCONJ Typo=Yes and lemma denn, but German denn is CCONJ; preserve the route boundary rather than reproducing the noisy treebank analysis.",
			contaminationKeys: ["de-sconj-policy:gsd-typo-den"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

function resolved(
	normalizedSurface: string,
	canonicalForm = normalizedSurface,
	spelling: "Canonical" | "Variant" = "Canonical",
	orthography: "Standard" | "Typo" = "Standard",
) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [orthography],
			surface: {
				normalizedSurface,
				spelling,
				realizationCoverage: "Full" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: { canonicalForm, coreFeatures: { conjType: null } },
		},
	};
}
