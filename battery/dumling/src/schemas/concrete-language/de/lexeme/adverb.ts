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
		comparable: DE_FEATURE_SCHEMA.comparable,
		// A w-adverb is one Lemma whose interrogative and relative uses are
		// Readings, so Int and Rel are no ADV values (system ADR 0029).
		pronType: DE_FEATURE_SCHEMA.pronType.extract(["Dem", "Ind", "Neg"]),
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
