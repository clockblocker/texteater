// Generated concrete schemas. Run bun run generate.
import { HeTransfixMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/morpheme/transfix.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Morpheme", kind: "Transfix" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
