import { z } from "zod";
import type { DeVerbFeatures } from "../../../../../types/concrete-language/features/de/lexeme/verb.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildFeatureObjectSchema,
	buildOptionalFeatureObjectSchema,
	markInflectionSurface,
} from "../../../../shared/feature-helpers.js";

export const deVerbInflectionalFeaturesSchema = markInflectionSurface(
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
) as unknown as z.ZodType<DeVerbFeatures["inflectional"]>;

export const deVerbFeaturesSchema = z.strictObject({
	core: buildOptionalFeatureObjectSchema({
		hasGovPrep: abstractFeatureAtomSchemas.hasGovPrep,
		hasSepPrefix: abstractFeatureAtomSchemas.hasSepPrefix,
		lexicallyReflexive: abstractFeatureAtomSchemas.lexicallyReflexive,
		verbType: z.literal("Mod"),
	}),
	inflectional: deVerbInflectionalFeaturesSchema,
}) satisfies z.ZodSchema<DeVerbFeatures>;
