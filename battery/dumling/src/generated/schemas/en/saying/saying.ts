// Generated concrete schemas. Run bun run generate.
import type { Assert } from "common-utils";
import type { z } from "zod";
import { EnSayingFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/saying/saying.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";
import type { IsUniversalFeatureBags } from "../../../../schemas/universal/features/catalog.js";

// The route's Feature Bags draw only on the Feature Pool (system ADR 0032).
type _InFeaturePool = Assert<
	IsUniversalFeatureBags<z.infer<typeof featureBags>>
>;
const schemas = buildUnitSchemas(
	{ language: "en", family: "Saying", kind: "Saying" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
