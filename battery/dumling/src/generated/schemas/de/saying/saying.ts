// Generated concrete schemas. Run bun run generate.
import { DeSayingFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/saying/saying.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Saying", kind: "Saying" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
