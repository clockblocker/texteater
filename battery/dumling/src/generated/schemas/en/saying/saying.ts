// Generated concrete schemas. Run bun run generate.
import { EnSayingFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/saying/saying.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Saying", kind: "Saying" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
