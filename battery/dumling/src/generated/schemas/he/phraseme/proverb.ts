// Generated concrete schemas. Run bun run generate.
import { HeProverbPhrasemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/phraseme/proverb.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Phraseme", kind: "Proverb" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
