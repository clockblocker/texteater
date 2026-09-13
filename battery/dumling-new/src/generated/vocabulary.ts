// Generated from canonical Zod enums. Run bun run generate.
export const UnitKind = {
	Lemma: "Lemma",
	Surface: "Surface",
	Reading: "Reading",
	Attestation: "Attestation",
} as const;
export const SurfaceKind = {
	Citation: "Citation",
	Inflection: "Inflection",
} as const;
export type UnitKind = (typeof UnitKind)[keyof typeof UnitKind];
export type SurfaceKind = (typeof SurfaceKind)[keyof typeof SurfaceKind];
