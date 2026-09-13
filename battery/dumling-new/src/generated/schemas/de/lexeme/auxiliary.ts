// Generated concrete schemas. Run bun run generate.
import { DeAuxiliaryFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/lexeme/auxiliary.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Lexeme", kind: "AUX" },
	featureBags.shape.core,
	featureBags.shape.inflectional,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
