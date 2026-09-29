// Generated concrete schemas. Run bun run generate.
import { DeForeignFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/foreign/foreign.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Foreign", kind: "Foreign" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
