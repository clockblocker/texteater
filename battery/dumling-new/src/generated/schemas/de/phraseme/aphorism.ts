// Generated concrete schemas. Run bun run generate.
import { DeAphorismPhrasemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/phraseme/aphorism.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Phraseme", kind: "Aphorism" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
