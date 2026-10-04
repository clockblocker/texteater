import { z } from "zod";
import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

// A NOUN Locution inflects for number like a noun: walks in the park (ADR
// 0039). An article that grammar changes is wording no feature describes.
export const EnNounLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: z.strictObject({
		number: EN_FEATURE_SCHEMA.number
			.extract(["Plur", "Ptan", "Sing"])
			.nullable(),
	}),
});
