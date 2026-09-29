// Generated concrete schemas. Run bun run generate.
import { HeForeignFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/foreign/foreign.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Foreign", kind: "Foreign" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
