import { supportedLanguages } from "dumling";
import { schemasFor } from "dumling/schema";
import type { SupportedLanguage } from "dumling/types";
import { type ZodType, z } from "zod";

import type { PromptInputSchema, PromptOutputSchema } from "../../assembly";

type DescriptorRegistry = Readonly<
	Record<string, Readonly<Record<string, ZodType>>>
>;
type NonEmptyStrings = readonly [string, ...string[]];

function descriptorRegistryFor(
	language: SupportedLanguage,
): DescriptorRegistry {
	return schemasFor[language].descriptor
		.Lemma as unknown as DescriptorRegistry;
}

function nonEmptyUnique(
	values: Iterable<string>,
	label: string,
): NonEmptyStrings {
	const unique = [...new Set(values)];
	if (unique.length === 0) {
		throw new Error(`Dumling exposes no ${label}.`);
	}
	return Object.freeze(unique) as unknown as NonEmptyStrings;
}

const descriptorRegistries = supportedLanguages.map(descriptorRegistryFor);
export const UNIT_SHADOW_CLASSIFICATION_FAMILIES = nonEmptyUnique(
	descriptorRegistries.flatMap((registry) => Object.keys(registry)),
	"Lemma Families",
);

export const UNIT_SHADOW_CLASSIFICATION_ROUTES = Object.freeze(
	Object.fromEntries(
		UNIT_SHADOW_CLASSIFICATION_FAMILIES.map((family) => [
			family,
			nonEmptyUnique(
				descriptorRegistries.flatMap((registry) =>
					Object.keys(registry[family] ?? {}),
				),
				`Lemma Kinds for ${family}`,
			),
		]),
	),
) as Readonly<Record<string, NonEmptyStrings>>;

const allKinds = nonEmptyUnique(
	Object.values(UNIT_SHADOW_CLASSIFICATION_ROUTES).flat(),
	"Lemma Kinds",
);

export function isSupportedUnitShadowClassificationRoute(
	language: SupportedLanguage,
	family: string,
	kind: string,
): boolean {
	return descriptorRegistryFor(language)[family]?.[kind] !== undefined;
}

function isSupportedByAnyLanguage(family: string, kind: string): boolean {
	return supportedLanguages.some((language) =>
		isSupportedUnitShadowClassificationRoute(language, family, kind),
	);
}

export const inputSchema = z.strictObject({
	language: z.enum(supportedLanguages),
	canonicalForm: z.string().trim().min(1),
	intendedUse: z.string().trim().min(1),
}) satisfies PromptInputSchema;

export const classifiedUnitShadowTargetSchema = z
	.strictObject({
		family: z.enum(UNIT_SHADOW_CLASSIFICATION_FAMILIES),
		kind: z.enum(allKinds),
	})
	.superRefine((target, context) => {
		if (!isSupportedByAnyLanguage(target.family, target.kind)) {
			context.addIssue({
				code: "custom",
				message: `${target.family}/${target.kind} is not a Dumling Lemma route.`,
			});
		}
	});

export const outputSchema = z
	.strictObject({
		decision: z.enum(["Resolved", "Unresolved"]),
		target: classifiedUnitShadowTargetSchema.nullable(),
	})
	.superRefine((output, context) => {
		if ((output.decision === "Resolved") !== (output.target !== null)) {
			context.addIssue({
				code: "custom",
				message:
					"Resolved requires a Family/Kind target; Unresolved requires target null.",
			});
		}
	}) satisfies PromptOutputSchema;
