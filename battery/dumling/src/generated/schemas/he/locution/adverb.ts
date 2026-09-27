// Generated concrete schemas. Run bun run generate.
import { HeAdverbLocutionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/he/locution/adverb.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "he", family: "Locution", kind: "ADV" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
