// Generated concrete schemas. Run bun run generate.
import { EnProverbPhrasemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/phraseme/proverb.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Phraseme", kind: "Proverb" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
