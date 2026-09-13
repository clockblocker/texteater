// Generated concrete schemas. Run bun run generate.
import { EnToneMarkingMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/en/morpheme/tone-marking.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "en", family: "Morpheme", kind: "ToneMarking" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
