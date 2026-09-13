// Generated concrete schemas. Run bun run generate.
import { DeCollocationPhrasemeFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/phraseme/collocation.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Phraseme", kind: "Collocation" },
	featureBags.shape.core,
	featureBags.shape.inflectional,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
