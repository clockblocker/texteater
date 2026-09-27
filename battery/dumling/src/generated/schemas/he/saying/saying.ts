// Generated concrete schemas. Run bun run generate.
import { HeSayingFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/saying/saying.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Saying", kind: "Saying" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
