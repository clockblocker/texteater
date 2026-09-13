import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeAdverbFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		foreign: DE_FEATURE_SCHEMA.foreign,
		numType: DE_FEATURE_SCHEMA.numType.extract(["Card", "Mult"]),
		pronType: DE_FEATURE_SCHEMA.pronType.extract([
			"Dem",
			"Ind",
			"Int",
			"Neg",
			"Rel",
		]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			degree: DE_FEATURE_SCHEMA.degree.extract(["Cmp", "Pos", "Sup"]),
		}),
	),
});

export type DeAdverbFeatureBags = z.infer<typeof DeAdverbFeatureBagsSchema>;

type _DeAdverbFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAdverbFeatureBags>
>;
