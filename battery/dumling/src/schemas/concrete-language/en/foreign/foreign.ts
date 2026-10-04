import { z } from "zod";
import { FeatureBagKind, featureBags } from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

// A Foreign unit's only Core Feature is the language it comes from, always
// set. It never inflects: its one Surface is its Canonical Form (ADR 0045).
export const EnForeignFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: z.strictObject({
		sourceLang: EN_FEATURE_SCHEMA.sourceLang,
	}),
});
