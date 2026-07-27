import { z } from "zod/v3";
import type { DeAuxiliaryFeatures } from "../../../../../types/concrete-language/features/de/lexeme/auxiliary";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas";
import {
	buildFeatureObjectSchema,
	buildOptionalFeatureObjectSchema,
} from "../../../../shared/feature-helpers";

const deAuxiliaryInflectionalFeaturesSchema = z.union([
	buildFeatureObjectSchema({
		number: abstractFeatureAtomSchemas.number
			.extract(["Plur", "Sing"])
			.optional(),
		tense: abstractFeatureAtomSchemas.tense
			.extract(["Past", "Pres"])
			.optional(),
		verbForm: z.never().optional(),
		voice: abstractFeatureAtomSchemas.voice.extract(["Pass"]).optional(),
	}).superRefine((value, ctx) => {
		if (
			value.number === undefined &&
			value.tense === undefined &&
			value.voice === undefined
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "inflectionalFeatures must not be empty",
			});
		}
	}),
	buildFeatureObjectSchema({
		mood: abstractFeatureAtomSchemas.mood.extract(["Imp"]),
		number: abstractFeatureAtomSchemas.number
			.extract(["Plur", "Sing"])
			.optional(),
		person: abstractFeatureAtomSchemas.person
			.extract(["1", "2", "3"])
			.optional(),
		tense: z.never().optional(),
		verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Fin"]),
		voice: abstractFeatureAtomSchemas.voice.extract(["Pass"]).optional(),
	}),
	buildFeatureObjectSchema({
		mood: abstractFeatureAtomSchemas.mood
			.extract(["Ind", "Sub"])
			.optional(),
		number: abstractFeatureAtomSchemas.number
			.extract(["Plur", "Sing"])
			.optional(),
		person: abstractFeatureAtomSchemas.person
			.extract(["1", "2", "3"])
			.optional(),
		tense: abstractFeatureAtomSchemas.tense
			.extract(["Past", "Pres"])
			.optional(),
		verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Fin"]),
		voice: abstractFeatureAtomSchemas.voice.extract(["Pass"]).optional(),
	}),
	buildFeatureObjectSchema({
		mood: z.never().optional(),
		number: abstractFeatureAtomSchemas.number
			.extract(["Plur", "Sing"])
			.optional(),
		person: z.never().optional(),
		tense: z.never().optional(),
		verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Inf"]),
		voice: abstractFeatureAtomSchemas.voice.extract(["Pass"]).optional(),
	}),
	buildFeatureObjectSchema({
		aspect: abstractFeatureAtomSchemas.aspect.extract(["Perf"]).optional(),
		gender: abstractFeatureAtomSchemas.gender
			.extract(["Fem", "Masc", "Neut"])
			.optional(),
		mood: z.never().optional(),
		number: abstractFeatureAtomSchemas.number
			.extract(["Plur", "Sing"])
			.optional(),
		person: z.never().optional(),
		tense: abstractFeatureAtomSchemas.tense
			.extract(["Past", "Pres"])
			.optional(),
		verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Part"]),
		voice: abstractFeatureAtomSchemas.voice.extract(["Pass"]).optional(),
	}),
]) as unknown as z.ZodType<DeAuxiliaryFeatures["inflectional"]>;

export const deAuxiliaryFeaturesSchema = z
	.object({
		inherent: buildOptionalFeatureObjectSchema({
			verbType: z.literal("Mod"),
		}),
		inflectional: deAuxiliaryInflectionalFeaturesSchema,
	})
	.strict() satisfies z.ZodSchema<DeAuxiliaryFeatures>;
