import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	type GoldenCaseRegistry,
} from "../../assembly";
import {
	lexicalResolutionInputSchema,
	lexicalResolutionOutputSchema,
	lexicalSegmentationInputSchema,
	lexicalSegmentationOutputSchema,
	morphologicalResolutionInputSchema,
	morphologicalResolutionOutputSchema,
	morphologicalSegmentationInputSchema,
	morphologicalSegmentationOutputSchema,
} from "./schemas";

const reading = (
	language: "de" | "en",
	canonicalForm: string,
	family: "Lexeme" | "Phraseme",
	kind: string,
	emojiDescription: string,
) => ({
	lemmaDescriptor: { language, canonicalForm, family, kind },
	emojiDescription,
});

const component = (
	nodeKind: "lexicalUnit" | "morpheme",
	sourceText: string,
) => ({ nodeKind, sourceText });

const structure = (...children: unknown[]) => ({
	nodeKind: "structure" as const,
	children,
});

const shadow = (
	language: "de" | "en",
	canonicalForm: string,
	family: "Lexeme" | "Phraseme",
	kind: string,
) => ({ language, canonicalForm, family, kind });

const morphemeReading = (
	language: "de" | "en",
	canonicalForm: string,
	kind: string,
	emojiDescription: string,
) => ({
	nodeKind: "morphemeReading" as const,
	reading: {
		lemmaDescriptor: {
			language,
			canonicalForm,
			family: "Morpheme" as const,
			kind,
		},
		emojiDescription,
	},
});

const unitShadow = (
	language: "de" | "en",
	canonicalForm: string,
	family: "Lexeme" | "Phraseme",
	kind: string,
) => ({
	nodeKind: "unitShadow" as const,
	unitShadow: shadow(language, canonicalForm, family, kind),
});

const morphologySegmentationCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"morphology-segment-compound-high-value-chunks": {
				input: {
					source: "Kohlekraftwerk",
					markedContext:
						"Das <TARGET>Kohlekraftwerk</TARGET> wird stillgelegt.",
					owner: reading(
						"de",
						"Kohlekraftwerk",
						"Lexeme",
						"NOUN",
						"🏭",
					),
				},
				idealOutput: {
					root: structure(
						component("lexicalUnit", "Kohle"),
						component("lexicalUnit", "Kraftwerk"),
					),
				},
				explanation:
					"The tree keeps two useful lexical chunks; their Dumling descriptors will carry the grammar.",
			},
			"morphology-segment-mixed-morpheme-and-lexeme": {
				input: {
					source: "entspannen",
					markedContext:
						"Musik hilft mir, mich zu <TARGET>entspannen</TARGET>.",
					owner: reading("de", "entspannen", "Lexeme", "VERB", "😌"),
				},
				idealOutput: {
					root: structure(
						component("morpheme", "ent-"),
						component("lexicalUnit", "spannen"),
					),
				},
			},
			"morphology-segment-nested-derivation": {
				input: {
					source: "Entspannung",
					markedContext:
						"Ich brauche etwas <TARGET>Entspannung</TARGET>.",
					owner: reading("de", "Entspannung", "Lexeme", "NOUN", "🧘"),
				},
				idealOutput: {
					root: structure(
						structure(
							component("morpheme", "ent-"),
							component("lexicalUnit", "spannen"),
						),
						component("morpheme", "-ung"),
					),
				},
				explanation:
					"Nesting alone records that the nominal form contains the verbal structure.",
			},
			"morphology-segment-phraseme-shadow": {
				input: {
					source: "forget-me-not-like",
					markedContext:
						"The flowers have a <TARGET>forget-me-not-like</TARGET> blue.",
					owner: reading(
						"en",
						"forget-me-not-like",
						"Lexeme",
						"ADJ",
						"🌸",
					),
				},
				idealOutput: {
					root: structure(
						component("lexicalUnit", "forget me not"),
						component("morpheme", "-like"),
					),
				},
			},
			"morphology-segment-reading-sensitive-tree": {
				input: {
					source: "unlockable",
					markedContext:
						"The chest is <TARGET>unlockable</TARGET> once the key arrives.",
					owner: reading("en", "unlockable", "Lexeme", "ADJ", "🔓"),
				},
				idealOutput: {
					root: structure(
						component("lexicalUnit", "unlock"),
						component("morpheme", "-able"),
					),
				},
				explanation:
					"The encounter selects one durable hierarchy; alternatives are not stored as Knowledge metadata.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof morphologicalSegmentationInputSchema,
			typeof morphologicalSegmentationOutputSchema
		>,
	},
);

export const morphologicalSegmentationCorpus = defineGoldenCorpus({
	route: "knowledge-analysis/morphological-tree/segmentation",
	inputSchema: morphologicalSegmentationInputSchema,
	outputSchema: morphologicalSegmentationOutputSchema,
	collections: { core: morphologySegmentationCases },
});

const morphologySeed = (
	id: keyof typeof morphologicalSegmentationCorpus.cases,
) => {
	const goldenCase = morphologicalSegmentationCorpus.cases[id];
	if (goldenCase === undefined)
		throw new Error(`Missing morphology seed ${id}.`);
	return { ...goldenCase.input, segmentation: goldenCase.idealOutput };
};

const morphologyResolutionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"morphology-resolve-direct-pointers": {
			input: morphologySeed(
				"morphology-segment-mixed-morpheme-and-lexeme",
			),
			idealOutput: {
				root: structure(
					morphemeReading("de", "ent-", "Prefix", "↩️"),
					unitShadow("de", "spannen", "Lexeme", "VERB"),
				),
			},
			explanation:
				"Only the Morpheme becomes a Reading draft; the lexical component remains a Unit Shadow.",
		},
		"morphology-resolve-nested-pointers": {
			input: morphologySeed("morphology-segment-nested-derivation"),
			idealOutput: {
				root: structure(
					structure(
						morphemeReading("de", "ent-", "Prefix", "↩️"),
						unitShadow("de", "spannen", "Lexeme", "VERB"),
					),
					morphemeReading("de", "-ung", "Suffix", "📦"),
				),
			},
		},
		"morphology-resolve-phraseme-shadow": {
			input: morphologySeed("morphology-segment-phraseme-shadow"),
			idealOutput: {
				root: structure(
					unitShadow("en", "forget me not", "Phraseme", "Idiom"),
					morphemeReading("en", "-like", "Suffix", "🔁"),
				),
			},
		},
	} as const satisfies GoldenCaseRegistry<
		typeof morphologicalResolutionInputSchema,
		typeof morphologicalResolutionOutputSchema
	>,
});

export const morphologicalResolutionCorpus = defineGoldenCorpus({
	route: "knowledge-analysis/morphological-tree/resolution",
	inputSchema: morphologicalResolutionInputSchema,
	outputSchema: morphologicalResolutionOutputSchema,
	collections: { core: morphologyResolutionCases },
});

const lexicalSegmentationCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"lexical-segment-phraseme-repetition": {
			input: {
				source: "so oder so",
				markedContext: "Das ist <TARGET>so oder so</TARGET> nötig.",
				owner: reading("de", "so oder so", "Phraseme", "Idiom", "🔁"),
			},
			idealOutput: { components: ["so", "oder", "so"] },
		},
		"lexical-segment-contextual-reflexive": {
			input: {
				source: "mich erinnern",
				markedContext: "Ich kann <TARGET>mich erinnern</TARGET>.",
				owner: reading("de", "sich erinnern", "Lexeme", "VERB", "🧠"),
			},
			idealOutput: { components: ["mich", "erinnern"] },
		},
		"lexical-segment-collocation": {
			input: {
				source: "in Betracht ziehen",
				markedContext:
					"Wir sollten das <TARGET>in Betracht ziehen</TARGET>.",
				owner: reading(
					"de",
					"in Betracht ziehen",
					"Phraseme",
					"Collocation",
					"🤔",
				),
			},
			idealOutput: { components: ["in", "Betracht", "ziehen"] },
		},
	} as const satisfies GoldenCaseRegistry<
		typeof lexicalSegmentationInputSchema,
		typeof lexicalSegmentationOutputSchema
	>,
});

export const lexicalSegmentationCorpus = defineGoldenCorpus({
	route: "knowledge-analysis/lexical-breakdown/segmentation",
	inputSchema: lexicalSegmentationInputSchema,
	outputSchema: lexicalSegmentationOutputSchema,
	collections: { core: lexicalSegmentationCases },
});

const lexicalSeed = (id: keyof typeof lexicalSegmentationCorpus.cases) => {
	const goldenCase = lexicalSegmentationCorpus.cases[id];
	if (goldenCase === undefined)
		throw new Error(`Missing lexical seed ${id}.`);
	return { ...goldenCase.input, segmentation: goldenCase.idealOutput };
};

const lexicalResolutionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"lexical-resolve-repeated-shadows": {
			input: lexicalSeed("lexical-segment-phraseme-repetition"),
			idealOutput: [
				shadow("de", "so", "Lexeme", "ADV"),
				shadow("de", "oder", "Lexeme", "CCONJ"),
				shadow("de", "so", "Lexeme", "ADV"),
			],
		},
		"lexical-resolve-contextual-shadows": {
			input: lexicalSeed("lexical-segment-contextual-reflexive"),
			idealOutput: [
				shadow("de", "sich", "Lexeme", "PRON"),
				shadow("de", "erinnern", "Lexeme", "VERB"),
			],
			explanation:
				"The encounter form mich resolves to the canonical Lexeme shadow sich; no component Reading is created.",
		},
		"lexical-resolve-collocation-shadows": {
			input: lexicalSeed("lexical-segment-collocation"),
			idealOutput: [
				shadow("de", "in", "Lexeme", "ADP"),
				shadow("de", "Betracht", "Lexeme", "NOUN"),
				shadow("de", "ziehen", "Lexeme", "VERB"),
			],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof lexicalResolutionInputSchema,
		typeof lexicalResolutionOutputSchema
	>,
});

export const lexicalResolutionCorpus = defineGoldenCorpus({
	route: "knowledge-analysis/lexical-breakdown/resolution",
	inputSchema: lexicalResolutionInputSchema,
	outputSchema: lexicalResolutionOutputSchema,
	collections: { core: lexicalResolutionCases },
});
