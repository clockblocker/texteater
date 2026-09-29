// Generated concrete schemas. Run bun run generate.
import { EnForeignFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/foreign/foreign.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Foreign", kind: "Foreign" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
