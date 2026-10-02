import type * as Dumling from "dumling/types";

import { germanAufJedenFallLemma, germanBVGLemma } from "./lemmas";

const aufJedenFallSurface = {
	unitKind: "Surface" as const,
	inflectionalFeatures: null,
	language: "de",
	normalizedSurface: "auf jeden Fall",
	spelling: { kind: "Canonical" },

	lemma: germanAufJedenFallLemma,
	surfaceFeatures: null,
} satisfies Dumling.Surface<"de", "Locution", "ADV">;

// Attestation: "Ich komme [auf] [jeden] [Fall] morgen."
export const germanAufJedenFallFullAttestation = {
	unitKind: "Attestation" as const,
	members: [
		{ attested: "auf", orthography: "Standard" },
		{ attested: "jeden", orthography: "Standard" },
		{ attested: "Fall", orthography: "Standard" },
	],
	realizationCoverage: "Full",
	surface: aufJedenFallSurface,
} satisfies Dumling.Attestation<"de", "Locution", "ADV">;

// Attestation: "In Berlin ... betreibt die [BVG] die U-Bahn Berlin ..."
export const germanBVGAbbreviationAttestation = {
	unitKind: "Attestation" as const,
	members: [{ attested: "BVG", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface" as const,
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "BVG",
		spelling: { kind: "Canonical" },

		lemma: germanBVGLemma,
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "PROPN">;
