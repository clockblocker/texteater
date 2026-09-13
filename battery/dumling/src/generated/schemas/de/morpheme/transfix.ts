// Generated concrete schemas. Run bun run generate.
import { DeTransfixMorphemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/morpheme/transfix.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Morpheme", kind: "Transfix" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
