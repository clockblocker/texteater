import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

type CoreFeatures = { readonly conjType: "Comp" | null };

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sconj-contextual-weil": {
			input: {
				markedContext: "Wir bleiben, <TARGET>weil</TARGET> es regnet.",
			},
			idealOutput: resolved("weil", { conjType: null }),
			explanation:
				"An ordinary contextual subordinator is uninflected and therefore still has a Citation Surface.",
			contaminationKeys: ["de-sconj-lemma:weil"],
		},
		"grammar-de-sconj-comparative-reduced-wie": {
			input: {
				markedContext: "Alles lief, <TARGET>wie</TARGET> besprochen.",
			},
			idealOutput: resolved("wie", { conjType: "Comp" }),
			explanation:
				"German GSD treats wie in the established reduced clause wie besprochen as SCONJ; the comparing conjunction carries ConjType=Comp even without an overt finite verb.",
			contaminationKeys: ["de-sconj-lemma:wie"],
		},
		"grammar-de-sconj-typo-obwol": {
			input: {
				markedContext:
					"Sie ging spazieren, <TARGET>obwol</TARGET> es regnete.",
			},
			idealOutput: resolved(
				"obwohl",
				{ conjType: null },
				"Typo",
				"obwohl",
			),
			explanation:
				"Repair the missing h in the normalized Surface and Lemma, and mark the attested member as Typo.",
			contaminationKeys: ["de-sconj-lemma:obwohl"],
		},
		"grammar-de-sconj-citation-dass": {
			input: {
				markedContext:
					"Wörterbucheintrag für die Subjunktion: <TARGET>dass</TARGET>",
			},
			idealOutput: resolved("dass", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:dass"],
		},
		"grammar-de-sconj-complement-dass": {
			input: {
				markedContext: "Mara weiß, <TARGET>dass</TARGET> Ben kommt.",
			},
			idealOutput: resolved("dass", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:dass"],
		},
		"grammar-de-sconj-conditional-wenn": {
			input: {
				markedContext: "Wir gehen, <TARGET>wenn</TARGET> es aufhört.",
			},
			idealOutput: resolved("wenn", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:wenn"],
		},
		"grammar-de-sconj-temporal-nachdem": {
			input: {
				markedContext:
					"<TARGET>Nachdem</TARGET> er gegessen hatte, ging er los.",
			},
			idealOutput: resolved("nachdem", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:nachdem"],
		},
		"grammar-de-sconj-temporal-waehrend": {
			input: {
				markedContext:
					"Sie las, <TARGET>während</TARGET> er das Essen kochte.",
			},
			idealOutput: resolved("während", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:während"],
		},
		"grammar-de-sconj-interrogative-ob": {
			input: {
				markedContext: "Ich frage mich, <TARGET>ob</TARGET> sie kommt.",
			},
			idealOutput: resolved("ob", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:ob"],
		},
		"grammar-de-sconj-temporal-bevor": {
			input: {
				markedContext:
					"Ruf mich an, <TARGET>bevor</TARGET> du losfährst.",
			},
			idealOutput: resolved("bevor", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:bevor"],
		},
		"grammar-de-sconj-conditional-falls": {
			input: {
				markedContext:
					"Nimm einen Schirm mit, <TARGET>falls</TARGET> es regnet.",
			},
			idealOutput: resolved("falls", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:falls"],
		},
		"grammar-de-sconj-temporal-seitdem": {
			input: {
				markedContext:
					"Es ist ruhiger, <TARGET>seitdem</TARGET> die Baustelle geschlossen wurde.",
			},
			idealOutput: resolved("seitdem", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:seitdem"],
		},
		"grammar-de-sconj-temporal-sobald": {
			input: {
				markedContext:
					"Wir starten, <TARGET>sobald</TARGET> alle bereit sind.",
			},
			idealOutput: resolved("sobald", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:sobald"],
		},
		"grammar-de-sconj-modal-indem": {
			input: {
				markedContext:
					"Sie half, <TARGET>indem</TARGET> sie die Daten prüfte.",
			},
			idealOutput: resolved("indem", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:indem"],
		},
		"grammar-de-sconj-causal-zumal": {
			input: {
				markedContext:
					"Wir bleiben hier, <TARGET>zumal</TARGET> es schon spät ist.",
			},
			idealOutput: resolved("zumal", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:zumal"],
		},
		"grammar-de-sconj-comparative-als-clause": {
			input: {
				markedContext:
					"Der Weg war länger, <TARGET>als</TARGET> wir erwartet hatten.",
			},
			idealOutput: resolved("als", { conjType: "Comp" }),
			contaminationKeys: ["de-sconj-lemma:als"],
		},
		"grammar-de-sconj-sentence-initial-dass": {
			input: {
				markedContext:
					"<TARGET>Dass</TARGET> du kommst, freut uns alle.",
			},
			idealOutput: resolved("dass", { conjType: null }),
			contaminationKeys: ["de-sconj-lemma:dass"],
		},
		"grammar-de-sconj-typo-wehn": {
			input: {
				markedContext: "Wir gehen, <TARGET>wehn</TARGET> es aufhört.",
			},
			idealOutput: resolved("wenn", { conjType: null }, "Typo", "wenn"),
			contaminationKeys: ["de-sconj-lemma:wenn"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

function resolved(
	normalizedMembers: string,
	coreFeatures: CoreFeatures,
	orthography: "Standard" | "Typo" = "Standard",
	canonicalForm = normalizedMembers,
	spelling: "Canonical" | "Variant" = "Canonical",
	surfaceFeatures: { readonly historicalStatus: "Archaic" } | null = null,
) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: [orthography],
			realizationCoverage: "Full" as const,
			normalizedMembers: [normalizedMembers],
			surface: {
				spelling,
				surfaceKind: "Citation" as const,
				surfaceFeatures,
			},
			lemma: { canonicalForm, coreFeatures },
		},
	};
}
