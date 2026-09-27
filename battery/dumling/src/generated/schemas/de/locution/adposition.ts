// Generated concrete schemas. Run bun run generate.
import { DeAdpositionLocutionFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/locution/adposition.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Locution", kind: "ADP" },
	featureBags.shape.core,
	undefined,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
