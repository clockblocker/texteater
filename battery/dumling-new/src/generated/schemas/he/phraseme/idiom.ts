// Generated concrete schemas. Run bun run generate.
import { HeIdiomPhrasemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/phraseme/idiom.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Phraseme", kind: "Idiom" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
