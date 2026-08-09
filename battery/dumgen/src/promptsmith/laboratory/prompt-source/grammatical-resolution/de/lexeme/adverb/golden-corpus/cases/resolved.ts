import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

type CoreFeatures = {
	readonly foreign: "Yes" | null;
	readonly numType: "Card" | "Mult" | null;
	readonly pronType: "Dem" | "Ind" | "Int" | "Neg" | "Rel" | null;
};

const unmarked = {
	foreign: null,
	numType: null,
	pronType: null,
} satisfies CoreFeatures;

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adv-demo-contextual-heute": {
			input: { markedContext: "Wir treffen uns <TARGET>heute</TARGET>." },
			idealOutput: resolvedSurface("heute", "heute", unmarked, null),
			explanation:
				"An ordinary ungraded contextual use remains Citation because the current ADV Inflection schema requires a non-null Degree.",
		},
		"grammar-de-adv-demo-citation-hier": {
			input: {
				markedContext: "Wörterbucheintrag: <TARGET>hier</TARGET>",
			},
			idealOutput: citation("hier", "hier", unmarked),
			explanation:
				"A dictionary label is Citation; German GSD leaves ordinary locative hier without PronType.",
		},
		"grammar-de-adv-demo-demonstrative-dazu": {
			input: {
				markedContext: "<TARGET>Dazu</TARGET> brauchen wir mehr Zeit.",
			},
			idealOutput: resolvedSurface(
				"dazu",
				"dazu",
				{ ...unmarked, pronType: "Dem" },
				null,
			),
			explanation:
				"German GSD treats the pronominal adverb dazu as lexically PronType=Dem; its ungraded contextual Surface remains Citation under the current codec.",
		},
		"grammar-de-adv-demo-indefinite-genug": {
			input: {
				markedContext: "Sie hat <TARGET>genug</TARGET> gearbeitet.",
			},
			idealOutput: resolvedSurface(
				"genug",
				"genug",
				{ ...unmarked, pronType: "Ind" },
				null,
			),
			explanation:
				"German GSD treats the quantitative adverb genug as lexically PronType=Ind; the nullable field remains non-null when the lexical class applies.",
		},
		"grammar-de-adv-demo-negative-nie": {
			input: {
				markedContext: "Er kommt <TARGET>nie</TARGET> zu spät.",
			},
			idealOutput: resolvedSurface(
				"nie",
				"nie",
				{ ...unmarked, pronType: "Neg" },
				null,
			),
			explanation:
				"German-LIT attests the negative adverb nie with PronType=Neg; German GSD has no lemma-disjoint Neg ADV beyond held-out keineswegs, so this demonstration applies the official German UD negative-proform policy without contaminating that held-out Lemma.",
		},
		"grammar-de-adv-demo-comparative-lieber": {
			input: {
				markedContext:
					"Sie fährt <TARGET>lieber</TARGET> mit dem Zug als mit dem Auto.",
			},
			idealOutput: resolvedSurface("lieber", "gern", unmarked, "Cmp"),
			explanation:
				"The irregular comparative is the contextual Surface of gern and carries Degree=Cmp.",
		},
		"grammar-de-adv-demo-superlative-am-liebsten": {
			input: {
				markedContext:
					"Sie reist <TARGET>am</TARGET> <TARGET>liebsten</TARGET> im Frühling.",
			},
			idealOutput: resolvedSurface(
				"am liebsten",
				"gern",
				unmarked,
				"Sup",
				["Standard", "Standard"],
			),
			explanation:
				"Both marked members realize the complete periphrastic superlative Surface, so coverage is Full and member counts follow TARGET pairs.",
		},
		"grammar-de-adv-demo-typo-gester": {
			input: { markedContext: "Er kam <TARGET>gester</TARGET> an." },
			idealOutput: resolvedSurface("gestern", "gestern", unmarked, null, [
				"Typo",
			]),
			explanation:
				"Repair the missing final n in normalizedSurface and canonicalForm and mark the attested member Typo.",
		},
		"grammar-de-adv-morgen": {
			input: { markedContext: "Der Zug fährt <TARGET>morgen</TARGET>." },
			idealOutput: resolvedSurface("morgen", "morgen", unmarked, null),
		},
		"grammar-de-adv-demonstrative-damit": {
			input: {
				markedContext: "<TARGET>Damit</TARGET> öffnen wir die Tür.",
			},
			idealOutput: resolvedSurface(
				"damit",
				"damit",
				{ ...unmarked, pronType: "Dem" },
				null,
			),
		},
		"grammar-de-adv-comparative-oefter": {
			input: {
				markedContext: "Seitdem kommt sie <TARGET>öfter</TARGET>.",
			},
			idealOutput: resolvedSurface("öfter", "oft", unmarked, "Cmp"),
		},
		"grammar-de-adv-superlative-am-haeufigsten": {
			input: {
				markedContext:
					"Im Herbst regnet es <TARGET>am</TARGET> <TARGET>häufigsten</TARGET>.",
			},
			idealOutput: { decision: "Unresolved", resolution: null },
			explanation:
				"The marked superlative Surface is compatible with the regular Lemma häufig and the suppletive paradigm of oft; this context does not establish exactly one Lemma identity.",
		},
		"grammar-de-adv-demonstrative-dort": {
			input: {
				markedContext: "Der Schlüssel liegt <TARGET>dort</TARGET>.",
			},
			idealOutput: resolvedSurface("dort", "dort", unmarked, null),
		},
		"grammar-de-adv-interrogative-warum": {
			input: { markedContext: "<TARGET>Warum</TARGET> gehst du schon?" },
			idealOutput: resolvedSurface(
				"warum",
				"warum",
				{
					...unmarked,
					pronType: "Int",
				},
				null,
			),
		},
		"grammar-de-adv-interrogative-identity-wo": {
			input: {
				markedContext:
					"Das ist die Stadt, <TARGET>wo</TARGET> ihre Familie lebt.",
			},
			idealOutput: resolvedSurface(
				"wo",
				"wo",
				{
					...unmarked,
					pronType: "Int",
				},
				null,
			),
			explanation:
				"German GSD keeps the ADV lemma wo at PronType=Int even in a relative-clause use; local syntax does not change stable Core Features.",
		},
		"grammar-de-adv-indefinite-etwas": {
			input: {
				markedContext:
					"Der zweite Entwurf ist <TARGET>etwas</TARGET> besser.",
			},
			idealOutput: resolvedSurface(
				"etwas",
				"etwas",
				{
					...unmarked,
					pronType: "Ind",
				},
				null,
			),
		},
		"grammar-de-adv-negative-keineswegs": {
			input: {
				markedContext:
					"Das Ergebnis ist <TARGET>keineswegs</TARGET> sicher.",
			},
			idealOutput: resolvedSurface(
				"keineswegs",
				"keineswegs",
				{
					...unmarked,
					pronType: "Neg",
				},
				null,
			),
		},
		"grammar-de-adv-multiplicative-zweimal": {
			input: { markedContext: "Sie klingelte <TARGET>zweimal</TARGET>." },
			idealOutput: resolvedSurface(
				"zweimal",
				"zweimal",
				{
					...unmarked,
					numType: "Mult",
				},
				null,
			),
		},
		"grammar-de-adv-causal-deshalb": {
			input: {
				markedContext:
					"Der Bus fiel aus; <TARGET>deshalb</TARGET> kam sie später.",
			},
			idealOutput: resolvedSurface("deshalb", "deshalb", unmarked, null),
		},
		"grammar-de-adv-sentence-initial-vielleicht": {
			input: {
				markedContext: "<TARGET>Vielleicht</TARGET> regnet es später.",
			},
			idealOutput: resolvedSurface(
				"vielleicht",
				"vielleicht",
				unmarked,
				null,
			),
		},
		"grammar-de-adv-typo-vielleich": {
			input: {
				markedContext: "Sie kommt <TARGET>vielleich</TARGET> später.",
			},
			idealOutput: resolvedSurface(
				"vielleicht",
				"vielleicht",
				unmarked,
				null,
				["Typo"],
			),
		},
		"grammar-de-adv-provisional-archaic-allhier": {
			input: {
				markedContext:
					"Der Unterzeichnete erklärt <TARGET>allhier</TARGET>.",
			},
			idealOutput: resolvedSurface(
				"allhier",
				"allhier",
				unmarked,
				null,
				["Standard"],
				{ historicalStatus: "Archaic" },
			),
			explanation:
				"Corpus-only probe: the form is identifiable, while the threshold for Archaic versus merely dated needs policy confirmation.",
		},
		"grammar-de-adv-provisional-foreign-circa": {
			input: {
				markedContext: "Es kamen <TARGET>circa</TARGET> hundert Gäste.",
			},
			idealOutput: resolvedSurface(
				"circa",
				"circa",
				{
					...unmarked,
					foreign: "Yes",
				},
				null,
			),
			explanation:
				"Corpus-only probe: whether lexicalized circa should retain Foreign=Yes is a Lemma-policy question.",
		},
		"grammar-de-adv-provisional-ordinal-erstens": {
			input: {
				markedContext: "<TARGET>Erstens</TARGET> fehlt uns die Zeit.",
			},
			idealOutput: resolvedSurface("erstens", "erstens", unmarked, null),
			explanation:
				"Corpus-only probe: erstens is an ordinal adverb, but the German ADV codec excludes NumType=Ord; policy must confirm whether the unsupported feature collapses to null.",
		},
		"grammar-de-adv-provisional-cardinal-indefinite-viel": {
			input: { markedContext: "Sie arbeitet <TARGET>viel</TARGET>." },
			idealOutput: resolvedSurface(
				"viel",
				"viel",
				{
					...unmarked,
					numType: "Card",
					pronType: "Ind",
				},
				null,
			),
			explanation:
				"Corpus-only probe: the codec permits ADV NumType=Card, but German annotation policy must confirm whether quantitative viel on this route carries Card together with PronType=Ind.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

function citation(
	normalizedSurface: string,
	canonicalForm: string,
	coreFeatures: CoreFeatures,
) {
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies: ["Standard" as const],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface,
				spelling: "Canonical" as const,
				surfaceKind: "Citation" as const,
				surfaceFeatures: null,
			},
			lemma: { canonicalForm, coreFeatures },
		},
	};
}

function resolvedSurface(
	normalizedSurface: string,
	canonicalForm: string,
	coreFeatures: CoreFeatures,
	degree: "Cmp" | "Pos" | "Sup" | null,
	memberOrthographies: ("Standard" | "Typo")[] = ["Standard"],
	surfaceFeatures: { readonly historicalStatus: "Archaic" } | null = null,
) {
	if (degree === null) {
		return {
			decision: "Resolved" as const,
			resolution: {
				memberOrthographies,
				realizationCoverage: "Full" as const,
				surface: {
					normalizedSurface,
					spelling: "Canonical" as const,
					surfaceKind: "Citation" as const,
					surfaceFeatures,
				},
				lemma: { canonicalForm, coreFeatures },
			},
		};
	}
	return {
		decision: "Resolved" as const,
		resolution: {
			memberOrthographies,
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface,
				spelling: "Canonical" as const,
				surfaceKind: "Inflection" as const,
				surfaceFeatures,
				inflectionalFeatures: { degree },
			},
			lemma: { canonicalForm, coreFeatures },
		},
	};
}
