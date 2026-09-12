import { z } from "zod";

const DISCOURSE_FORMULA = z.literal("DiscourseFormula");
const APHORISM = z.literal("Aphorism");
const PROVERB = z.literal("Proverb");
const IDIOM = z.literal("Idiom");
const COLLOCATION = z.literal("Collocation");

export const PhrasemeKindSchema = z.enum([
	DISCOURSE_FORMULA.value,
	APHORISM.value,
	PROVERB.value,
	IDIOM.value,
	COLLOCATION.value,
]);
export const PhrasemeKind = PhrasemeKindSchema.enum;
export type PhrasemeKind = z.infer<typeof PhrasemeKindSchema>;
