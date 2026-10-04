import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { EnVerbFeatureBagsSchema } from "../lexeme/verb.js";

// A VERB Locution inflects like a verb: kicked the bucket (ADR 0039).
export const EnVerbLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]:
		EnVerbFeatureBagsSchema.shape[FeatureBagKind.Inflectional],
});
