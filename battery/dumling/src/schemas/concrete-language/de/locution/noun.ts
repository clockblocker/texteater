import { z } from "zod";
import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// A NOUN Locution declines like a noun: unter weißen Raben (ADR 0039). Core
// gender lets a host show its article. An article that grammar changes is
// wording no feature describes, so the Surface marks only case and number.
export const DeNounLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		gender: DE_FEATURE_SCHEMA.gender,
	}),
	[FeatureBagKind.Inflectional]: z.strictObject({
		case: DE_FEATURE_SCHEMA.case.nullable(),
		number: DE_FEATURE_SCHEMA.number.nullable(),
	}),
});
