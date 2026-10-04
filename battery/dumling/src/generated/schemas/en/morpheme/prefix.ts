// Generated concrete schemas. Run bun run generate.
import type { Assert } from "common-utils";
import type { z } from "zod";
import { EnPrefixMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/morpheme/prefix.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";
import type { IsUniversalFeatureBags } from "../../../../schemas/universal/features/catalog.js";

// The route's Feature Bags draw only on the Feature Pool (system ADR 0032).
type _InFeaturePool = Assert<
	IsUniversalFeatureBags<z.infer<typeof featureBags>>
>;
const schemas = buildUnitSchemas(
	{ language: "en", family: "Morpheme", kind: "Prefix" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
