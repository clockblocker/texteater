import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

// A NOUN Locution inflects for number like a noun: walks in the park (ADR
// 0039). An article that grammar changes is wording no feature describes.
export const EnNounLocutionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: z.strictObject({
		number: EN_FEATURE_SCHEMA.number
			.extract(["Plur", "Ptan", "Sing"])
			.nullable(),
	}),
});

export type EnNounLocutionFeatureBags = z.infer<
	typeof EnNounLocutionFeatureBagsSchema
>;

type _EnNounLocutionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnNounLocutionFeatureBags>
>;
