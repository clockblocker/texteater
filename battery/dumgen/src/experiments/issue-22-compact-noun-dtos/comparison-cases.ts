import type { output } from "zod";
import type { outputSchema as verboseGrammarOutputSchema } from "../../promptsmith/laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/output-schema";
import type { outputSchema as verboseReadingOutputSchema } from "../../promptsmith/laboratory/prompt-part/reading-resolution/de/lexeme/noun/output-schema";
import type { GrammaticalResolution, ReadingResolution } from "../../types";
import type {
	grammaticalInputSchema,
	readingInputSchema,
} from "./compact-codecs";

type GrammaticalInput = output<typeof grammaticalInputSchema>;
type ReadingInput = output<typeof readingInputSchema>;
type VerboseGrammaticalOutput = output<typeof verboseGrammarOutputSchema>;
type VerboseReadingOutput = output<typeof verboseReadingOutputSchema>;

export type GrammaticalComparisonCase = {
	readonly id: string;
	readonly input: GrammaticalInput;
	readonly expectedCanonical: GrammaticalResolution;
	readonly verboseReferenceOutput: VerboseGrammaticalOutput;
};

export type ReadingComparisonCase = {
	readonly id: string;
	readonly input: ReadingInput;
	readonly expectedCanonical: ReadingResolution;
	readonly verboseReferenceOutput: VerboseReadingOutput;
};

export const GRAMMATICAL_COMPARISON_CASES = [
	{
		id: "grammar-library-dative",
		input: {
			markedContext: "Wir sitzen in der <TARGET>Bibliothek</TARGET>.",
		},
		expectedCanonical: {
			decision: "Resolved",
			memberOrthographies: ["Standard"],
			surface: {
				language: "de",
				normalizedSurface: "Bibliothek",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: { case: "Dat", number: "Sing" },
			},
			lemma: {
				canonicalForm: "Bibliothek",
				coreFeatures: { gender: "Fem", hyph: null },
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			},
		},
		verboseReferenceOutput: {
			decision: "Resolved",
			resolution: {
				memberOrthographies: ["Standard"],
				surface: {
					normalizedSurface: "Bibliothek",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: { case: "Dat", number: "Sing" },
				},
				lemma: {
					canonicalForm: "Bibliothek",
					coreFeatures: { gender: "Fem", hyph: null },
				},
			},
		},
	},
	{
		id: "grammar-bank-plural",
		input: {
			markedContext: "Die <TARGET>Banken</TARGET> sind geöffnet.",
		},
		expectedCanonical: {
			decision: "Resolved",
			memberOrthographies: ["Standard"],
			surface: {
				language: "de",
				normalizedSurface: "Banken",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: { case: "Nom", number: "Plur" },
			},
			lemma: {
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			},
		},
		verboseReferenceOutput: {
			decision: "Resolved",
			resolution: {
				memberOrthographies: ["Standard"],
				surface: {
					normalizedSurface: "Banken",
					spelling: "Canonical",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
					surfaceFeatures: null,
					inflectionalFeatures: { case: "Nom", number: "Plur" },
				},
				lemma: {
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
				},
			},
		},
	},
] satisfies readonly GrammaticalComparisonCase[];

export const READING_COMPARISON_CASES = [
	{
		id: "reading-library-new",
		input: {
			markedContext: "Wir sitzen in der <TARGET>Bibliothek</TARGET>.",
			lemma: {
				canonicalForm: "Bibliothek",
				coreFeatures: { gender: "Fem", hyph: null },
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			},
			existingEmojiDescriptions: [],
		},
		expectedCanonical: {
			decision: "New",
			emojiDescription: "📚",
		},
		verboseReferenceOutput: {
			decision: "New",
			emojiDescription: "📚",
		},
	},
	{
		id: "reading-tea-reuse",
		input: {
			markedContext: "Der <TARGET>Tee</TARGET> duftet.",
			lemma: {
				canonicalForm: "Tee",
				coreFeatures: { gender: "Masc", hyph: null },
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			},
			existingEmojiDescriptions: ["☕"],
		},
		expectedCanonical: {
			decision: "Reuse",
			emojiDescription: "☕",
		},
		verboseReferenceOutput: {
			decision: "Reuse",
			emojiDescription: "☕",
		},
	},
] satisfies readonly ReadingComparisonCase[];
