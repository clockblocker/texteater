// Generated concrete schemas. Run bun run generate.
import { EnIdiomPhrasemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/phraseme/idiom.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Phraseme", kind: "Idiom" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
