// Generated concrete schemas. Run bun run generate.
import { DeSubordinatingConjunctionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/lexeme/subordinating-conjunction.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Lexeme", kind: "SCONJ" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
