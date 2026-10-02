import { z } from "zod";

export const FeatureBagKindSchema = z.enum({
	Core: "core",
	Inflectional: "inflectional",
});
export const FeatureBagKind = FeatureBagKindSchema.enum;
export type FeatureBagKind = z.infer<typeof FeatureBagKindSchema>;
