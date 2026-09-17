// Generated concrete schemas. Run bun run generate.

import { DeDeterminerFeatureBagsSchema as articleBags } from "../../../../schemas/concrete-language/de/lexeme/determiner.js";
import { DeNounFeatureBagsSchema as featureBags } from "../../../../schemas/concrete-language/de/lexeme/noun.js";
import { buildUnitSchemas } from "../../../../schemas/units.js";

const schemas = buildUnitSchemas(
	{ language: "de", family: "Lexeme", kind: "NOUN" },
	featureBags.shape.core,
	featureBags.shape.inflectional,
	articleBags,
);
export const lemmaSchema = schemas.Lemma;
export const surfaceSchema = schemas.Surface;
export const readingSchema = schemas.Reading;
export const attestationSchema = schemas.Attestation;
