import type { LemmaFamilyFor, LemmaKindFor } from "dumling/types";

export type GermanGrammaticalRoute = {
	readonly [Family in LemmaFamilyFor<"de">]: {
		readonly family: Family;
		readonly kind: LemmaKindFor<"de", Family>;
	};
}[LemmaFamilyFor<"de">];

type GermanRouteKindInventory = {
	readonly [Family in LemmaFamilyFor<"de">]: {
		readonly enabled: readonly LemmaKindFor<"de", Family>[];
		readonly notImplemented: readonly LemmaKindFor<"de", Family>[];
	};
};

export const DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS = {
	Lexeme: {
		enabled: [
			"ADJ",
			"ADP",
			"ADV",
			"AUX",
			"CCONJ",
			"DET",
			"INTJ",
			"NOUN",
			"NUM",
			"PART",
			"PRON",
			"PROPN",
			"SCONJ",
			"SYM",
			"VERB",
			"X",
		],
		notImplemented: ["PUNCT"],
	},
	Phraseme: {
		enabled: ["Aphorism", "DiscourseFormula", "Idiom", "Proverb"],
		notImplemented: ["Collocation"],
	},
	Morpheme: {
		enabled: [],
		notImplemented: [
			"Root",
			"Prefix",
			"Suffix",
			"Suffixoid",
			"Infix",
			"Circumfix",
			"Interfix",
			"Transfix",
			"Clitic",
			"ToneMarking",
			"Duplifix",
		],
	},
	Construction: {
		enabled: ["Fusion", "PairedFrame"],
		notImplemented: [],
	},
} as const satisfies GermanRouteKindInventory;

export const DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES = routesFor("enabled");

export const DE_NOT_IMPLEMENTED_GRAMMATICAL_RESOLUTION_ROUTES =
	routesFor("notImplemented");

function routesFor(
	status: "enabled" | "notImplemented",
): readonly GermanGrammaticalRoute[] {
	return Object.entries(DE_GRAMMATICAL_RESOLUTION_ROUTE_KINDS).flatMap(
		([family, kinds]) =>
			kinds[status].map(
				(kind) => ({ family, kind }) as GermanGrammaticalRoute,
			),
	);
}
