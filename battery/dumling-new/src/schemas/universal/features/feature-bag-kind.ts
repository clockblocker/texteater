import { z } from "zod";

const CORE = z.literal("core");
const INFLECTIONAL = z.literal("inflectional");

export const FeatureBagKindSchema = z.enum({
	Core: CORE.value,
	Inflectional: INFLECTIONAL.value,
});
export const FeatureBagKind = FeatureBagKindSchema.enum;
export type FeatureBagKind = z.infer<typeof FeatureBagKindSchema>;
