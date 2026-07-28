import { z } from "zod";
import type { DeAuxiliaryFeatures } from "../../../../../types/concrete-language/features/de/lexeme/auxiliary.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildFeatureObjectSchema,
	buildOptionalFeatureObjectSchema,
	markInflectionSurface,
} from "../../../../shared/feature-helpers.js";

const deAuxiliaryInflectionalFeaturesSchema = markInflectionSurface(
	z.union([
		buildFeatureObjectSchema({
			number: abstractFeatureAtomSchemas.number
				.extract(["Plur", "Sing"])
				.nullable(),
			tense: abstractFeatureAtomSchemas.tense
				.extract(["Past", "Pres"])
				.nullable(),
			verbForm: z.null(),
			voice: abstractFeatureAtomSchemas.voice
				.extract(["Pass"])
				.nullable(),
		}).superRefine((value, ctx) => {
			if (
				value.number === null &&
				value.tense === null &&
				value.voice === null
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
				.nullable(),
			person: abstractFeatureAtomSchemas.person
				.extract(["1", "2", "3"])
				.nullable(),
			tense: z.null(),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Fin"]),
			voice: abstractFeatureAtomSchemas.voice
				.extract(["Pass"])
				.nullable(),
		}),
		buildFeatureObjectSchema({
			mood: abstractFeatureAtomSchemas.mood
				.extract(["Ind", "Sub"])
				.nullable(),
			number: abstractFeatureAtomSchemas.number
				.extract(["Plur", "Sing"])
				.nullable(),
			person: abstractFeatureAtomSchemas.person
				.extract(["1", "2", "3"])
				.nullable(),
			tense: abstractFeatureAtomSchemas.tense
				.extract(["Past", "Pres"])
				.nullable(),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Fin"]),
			voice: abstractFeatureAtomSchemas.voice
				.extract(["Pass"])
				.nullable(),
		}),
		buildFeatureObjectSchema({
			mood: z.null(),
			number: abstractFeatureAtomSchemas.number
				.extract(["Plur", "Sing"])
				.nullable(),
			person: z.null(),
			tense: z.null(),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Inf"]),
			voice: abstractFeatureAtomSchemas.voice
				.extract(["Pass"])
				.nullable(),
		}),
		buildFeatureObjectSchema({
			aspect: abstractFeatureAtomSchemas.aspect
				.extract(["Perf"])
				.nullable(),
			gender: abstractFeatureAtomSchemas.gender
				.extract(["Fem", "Masc", "Neut"])
				.nullable(),
			mood: z.null(),
			number: abstractFeatureAtomSchemas.number
				.extract(["Plur", "Sing"])
				.nullable(),
			person: z.null(),
			tense: abstractFeatureAtomSchemas.tense
				.extract(["Past", "Pres"])
				.nullable(),
			verbForm: abstractFeatureAtomSchemas.verbForm.extract(["Part"]),
			voice: abstractFeatureAtomSchemas.voice
				.extract(["Pass"])
				.nullable(),
		}),
	]),
) as unknown as z.ZodType<DeAuxiliaryFeatures["inflectional"]>;

export const deAuxiliaryFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		verbType: z.literal("Mod"),
	}),
	inflectional: deAuxiliaryInflectionalFeaturesSchema,
}) satisfies z.ZodSchema<DeAuxiliaryFeatures>;
