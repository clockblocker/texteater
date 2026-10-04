import { z } from "zod";
import { FeatureBagKind, featureBags } from "../../../universal/index.js";
import {
	DE_FEATURE_SCHEMA,
	DeVerbalInflectionalFeatureBagSchema,
} from "../de-feature-catalog.js";

const DeVerbCoreFeatureBagSchema = z.strictObject({
	hasSepPrefix: DE_FEATURE_SCHEMA.hasSepPrefix.nullable(),
	lexicallyReflexive: DE_FEATURE_SCHEMA.lexicallyReflexive.nullable(),
});

export const DeVerbFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: DeVerbCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});
