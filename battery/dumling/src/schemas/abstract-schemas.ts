import type { z } from "zod";
import { z as zod } from "zod";
import {
	AbstractLanguageTag,
	LemmaFamily,
	LemmaKind,
	SurfaceKind,
} from "../types/core/enums.js";
import type {
	AbstractLemma,
	AbstractLemmaKindFor,
	AbstractSelection,
	AbstractSurface,
	EntityKind,
	LemmaFamily as LemmaFamilyType,
	SurfaceKind as SurfaceKindType,
} from "../types/public-types.js";
import { abstractRuntimeSchemas } from "./abstract/registry.js";

type AbstractLemmaDescriptor = {
	[LK in LemmaFamilyType]: {
		language: string;
		family: LK;
		kind: AbstractLemmaKindFor<LK>;
	};
}[LemmaFamilyType];

type AbstractSurfaceDescriptor = AbstractLemmaDescriptor & {
	surfaceKind: SurfaceKindType;
};

type AbstractSelectionDescriptor = AbstractSurfaceDescriptor;

type AbstractDescriptor<K extends EntityKind> = K extends "Lemma"
	? AbstractLemmaDescriptor
	: K extends "Surface"
		? AbstractSurfaceDescriptor
		: AbstractSelectionDescriptor;

type AbstractSchemaRegistry = {
	descriptor: {
		[K in EntityKind]: z.ZodType<AbstractDescriptor<K>>;
	};
	entity: {
		Lemma: z.ZodType<AbstractLemma<string>>;
		Surface: z.ZodType<AbstractSurface<string>>;
		Selection: z.ZodType<AbstractSelection<string>>;
	};
};

const abstractLemmaDescriptorSchema = zod.strictObject({
	language: AbstractLanguageTag,
	family: LemmaFamily,
	kind: LemmaKind,
}) as unknown as z.ZodType<AbstractDescriptor<"Lemma">>;

const abstractSurfaceDescriptorSchema = zod.strictObject({
	language: AbstractLanguageTag,
	family: LemmaFamily,
	kind: LemmaKind,
	surfaceKind: SurfaceKind,
}) as unknown as z.ZodType<AbstractDescriptor<"Surface">>;

const abstractSelectionDescriptorSchema = zod.strictObject({
	language: AbstractLanguageTag,
	family: LemmaFamily,
	kind: LemmaKind,
	surfaceKind: SurfaceKind,
}) as unknown as z.ZodType<AbstractDescriptor<"Selection">>;

export const abstractSchemas = {
	entity: {
		Lemma: abstractRuntimeSchemas.lemma,
		Surface: abstractRuntimeSchemas.surface,
		Selection: abstractRuntimeSchemas.selection,
	},
	descriptor: {
		Lemma: abstractLemmaDescriptorSchema,
		Surface: abstractSurfaceDescriptorSchema,
		Selection: abstractSelectionDescriptorSchema,
	},
} satisfies AbstractSchemaRegistry;
