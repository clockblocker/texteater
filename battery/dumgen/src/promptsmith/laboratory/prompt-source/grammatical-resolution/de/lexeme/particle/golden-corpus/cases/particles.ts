import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

type CoreFeatures = {
	readonly abbr: "Yes" | null;
	readonly foreign: "Yes" | null;
	readonly partType: "Inf" | null;
	readonly polarity: "Neg" | "Pos" | null;
};

const unmarkedCore = {
	abbr: null,
	foreign: null,
	partType: null,
	polarity: null,
} as const;

export const particleCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-part-demo-modal-halt": {
			input: {
				markedContext: "Das ist <TARGET>halt</TARGET> so.",
			},
			idealOutput: resolved("halt", unmarkedCore),
			explanation:
				"The contextual modal particle is uninflected and therefore has a Citation Surface. The German codec does not expose PartType=Mod, so its Core Features remain null.",
			contaminationKeys: ["de-part-lemma:halt"],
		},
		"grammar-de-part-negative-nicht": {
			input: {
				markedContext: "Mara kommt heute <TARGET>nicht</TARGET>.",
			},
			idealOutput: resolved("nicht", {
				...unmarkedCore,
				polarity: "Neg",
			}),
			contaminationKeys: ["de-part-lemma:nicht"],
		},
		"grammar-de-part-negative-sentence-initial-nicht": {
			input: {
				markedContext: "<TARGET>Nicht</TARGET> alle Gäste kamen.",
			},
			idealOutput: resolved("nicht", {
				...unmarkedCore,
				polarity: "Neg",
			}),
			contaminationKeys: ["de-part-lemma:nicht"],
		},
		"grammar-de-part-infinitival-zu": {
			input: {
				markedContext: "Sie versucht, <TARGET>zu</TARGET> schlafen.",
			},
			idealOutput: resolved("zu", {
				...unmarkedCore,
				partType: "Inf",
			}),
			contaminationKeys: ["de-part-lemma:zu"],
		},
		"grammar-de-part-modal-doch": {
			input: { markedContext: "Komm <TARGET>doch</TARGET> mit!" },
			idealOutput: resolved("doch", unmarkedCore),
			contaminationKeys: ["de-part-lemma:doch"],
		},
		"grammar-de-part-modal-denn": {
			input: {
				markedContext: "Was machst du <TARGET>denn</TARGET>?",
			},
			idealOutput: resolved("denn", unmarkedCore),
			contaminationKeys: ["de-part-lemma:denn"],
		},
		"grammar-de-part-modal-wohl": {
			input: {
				markedContext: "Er wird <TARGET>wohl</TARGET> später kommen.",
			},
			idealOutput: resolved("wohl", unmarkedCore),
			contaminationKeys: ["de-part-lemma:wohl"],
		},
		"grammar-de-part-modal-bloss": {
			input: {
				markedContext: "Was soll ich <TARGET>bloß</TARGET> tun?",
			},
			idealOutput: resolved("bloß", unmarkedCore),
			contaminationKeys: ["de-part-lemma:bloß"],
		},
		"grammar-de-part-modal-mal": {
			input: { markedContext: "Schau <TARGET>mal</TARGET> her." },
			idealOutput: resolved("mal", unmarkedCore),
			contaminationKeys: ["de-part-lemma:mal"],
		},
		"grammar-de-part-modal-ja": {
			input: {
				markedContext: "Das ist <TARGET>ja</TARGET> erstaunlich.",
			},
			idealOutput: resolved("ja", unmarkedCore),
			explanation:
				"Modal ja is not an affirmative response here. German UD uses Polarity only for negative nicht, and the current codec does not expose PartType=Mod.",
			contaminationKeys: ["de-part-form:ja"],
		},
		"grammar-de-part-modal-label-eigentlich": {
			input: {
				markedContext:
					"Bezeichnung als Modalpartikel: <TARGET>eigentlich</TARGET>",
			},
			idealOutput: resolved("eigentlich", unmarkedCore),
			contaminationKeys: ["de-part-lemma:eigentlich"],
		},
		"grammar-de-part-repeated-second-doch": {
			input: {
				markedContext:
					"Komm doch mit und sag <TARGET>doch</TARGET> Bescheid.",
			},
			idealOutput: resolved("doch", unmarkedCore),
			contaminationKeys: ["de-part-lemma:doch"],
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
				surfaceFeatures: null,
			},
			lemma: { canonicalForm, coreFeatures },
		},
	};
}
