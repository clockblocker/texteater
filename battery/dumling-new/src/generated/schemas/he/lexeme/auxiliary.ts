// Generated concrete schemas. Run bun run generate.
import { HeAuxiliaryFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/lexeme/auxiliary.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Lexeme", kind: "AUX" },
	featureBags.shape.core,
	featureBags.shape.inflectional,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
