/**
 * Per-language normalization and key-folding hooks for identity comparisons.
 * Each language declares its own hooks so script-specific normalization (for
 * example, Semitic diacritic stripping or CJK reading/script folding) can
 * evolve without modifying shared identity code.
 */
export interface LanguageNormalization {
	/** Folds letter case according to the language's own rules. */
	readonly foldCase: (value: string) => string;
	/**
	 * Produces the canonical comparison key for a form in this language:
	 * normalizes the form and applies the language's key-folding rules.
	 */
	readonly canonicalFormKey: (value: string) => string;
}

/**
 * One Dumling validation operation entry, shared between the runtime operation
 * map and the build-time Zod compiler registrations.
 */
export type ValidationOperationEntry =
	| Readonly<{
			construct: "custom";
			implementation: (input: never) => boolean;
			error: () => string;
			name: string;
			version: number;
	  }>
	| Readonly<{
			construct: "overwrite";
			implementation: (input: string) => string;
			name: string;
			version: number;
	  }>;
