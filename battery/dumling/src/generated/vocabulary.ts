// Generated from canonical Zod enums. Run bun run generate.
export const UnitKind = {
	Lemma: "Lemma",
	Surface: "Surface",
	Reading: "Reading",
	Attestation: "Attestation",
} as const;
export type UnitKind = (typeof UnitKind)[keyof typeof UnitKind];
export const VariantTag = {
	Licensed: "Licensed",
	Historical: "Historical",
	Regional: "Regional",
	Expressive: "Expressive",
} as const;
export type VariantTag = (typeof VariantTag)[keyof typeof VariantTag];
