// Generated concrete schemas. Run bun run generate.
import { EnConstructionFusionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/construction/fusion.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Construction", kind: "Fusion" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
