import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DeVerbalInflectionalFeatureBagSchema } from "../de-feature-catalog.js";

// AUX is sein, haben and werden, recipient-passive bekommen and causative
// lassen, in grammatical function only. Modals are VERBs (ADR 0026).
export const DeAuxiliaryFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});
