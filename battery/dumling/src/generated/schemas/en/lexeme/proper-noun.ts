// Generated concrete schemas. Run bun run generate.
import { EnProperNounFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/lexeme/proper-noun.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Lexeme", kind: "PROPN" },
	featureBags.shape.core,
	featureBags.shape.inflectional,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
