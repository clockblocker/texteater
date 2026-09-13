// Generated concrete schemas. Run bun run generate.
import { EnInfixMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/morpheme/infix.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Morpheme", kind: "Infix" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
