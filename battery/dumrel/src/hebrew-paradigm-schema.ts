import { z } from "zod";

/** Positive, individually labeled forms; this is not a claim of a complete table. */
export const hebrewParadigmSchema = z.strictObject({
	forms: z
		.array(
			z.strictObject({
				form: z.string().min(1),
				features: z.strictObject({
					gender: z.enum(["Masc", "Fem"]).optional(),
					number: z.enum(["Sing", "Plur", "Dual"]).optional(),
					person: z.enum(["1", "2", "3"]).optional(),
					tense: z.enum(["Past", "Fut"]).optional(),
					verbForm: z.enum(["Inf", "Part"]).optional(),
					mood: z.literal("Imp").optional(),
					definite: z.enum(["Ind", "Def", "Cons"]).optional(),
					voice: z.enum(["Act", "Mid", "Pass"]).optional(),
					polarity: z.enum(["Pos", "Neg"]).optional(),
				}),
			}),
		)
		.min(1)
		.max(100),
});
