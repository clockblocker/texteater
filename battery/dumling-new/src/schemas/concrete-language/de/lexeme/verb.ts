import type { Assert } from "common-utils";
import { z } from "zod";
import {
	FeatureBagKind,
	type IsUniversalFeatureBags,
} from "../../../universal/index.js";
import {
	DE_FEATURE_SCHEMA,
	DeVerbalInflectionalFeatureBagSchema,
} from "../de-feature-catalog.js";

const DeVerbCoreFeatureBagSchema = z.strictObject({
	hasGovPrep: DE_FEATURE_SCHEMA.hasGovPrep.nullable(),
	hasSepPrefix: DE_FEATURE_SCHEMA.hasSepPrefix.nullable(),
	lexicallyReflexive: DE_FEATURE_SCHEMA.lexicallyReflexive.nullable(),
	verbType: DE_FEATURE_SCHEMA.modalVerbType.nullable(),
});

export const DeVerbFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: DeVerbCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});

export type DeVerbFeatureBags = z.infer<typeof DeVerbFeatureBagsSchema>;

type _DeVerbFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeVerbFeatureBags>
>;
