// Generated concrete schemas. Run bun run generate.
import type { Assert } from "common-utils";
import type { z } from "zod";
import { HeNounFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/lexeme/noun.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";
import type { IsUniversalFeatureBags } from "../../../../schemas/universal/features/catalog.js";

// The route's Feature Bags draw only on the Feature Pool (system ADR 0032).
type _InFeaturePool = Assert<
	IsUniversalFeatureBags<z.infer<typeof featureBags>>
>;
const schemas = buildUnitSchemas(
	{ language: "he", family: "Lexeme", kind: "NOUN" },
	featureBags.shape.core,
	featureBags.shape.inflectional,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
