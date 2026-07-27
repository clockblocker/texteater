import type { z } from "zod/v3";
import { z as zod } from "zod/v3";
import {
	AbstractLanguageTag,
	LemmaKind,
	LemmaSubKind,
	SurfaceKind,
} from "../types/core/enums";
import type {
	AbstractLemma,
	AbstractLemmaSubKindFor,
	AbstractSelection,
	AbstractSurface,
	EntityKind,
	LemmaKind as LemmaKindType,
	SurfaceKind as SurfaceKindType,
} from "../types/public-types";
import { abstractRuntimeSchemas } from "./abstract/registry";

type AbstractLemmaDescriptor = {
	[LK in LemmaKindType]: {
		language: string;
		lemmaKind: LK;
		lemmaSubKind: AbstractLemmaSubKindFor<LK>;
	};
}[LemmaKindType];

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

const abstractLemmaDescriptorSchema = zod
	.object({
		language: AbstractLanguageTag,
		lemmaKind: LemmaKind,
		lemmaSubKind: LemmaSubKind,
	})
	.strict() as unknown as z.ZodType<AbstractDescriptor<"Lemma">>;

const abstractSurfaceDescriptorSchema = zod
	.object({
		language: AbstractLanguageTag,
		lemmaKind: LemmaKind,
		lemmaSubKind: LemmaSubKind,
		surfaceKind: SurfaceKind,
	})
	.strict() as unknown as z.ZodType<AbstractDescriptor<"Surface">>;

const abstractSelectionDescriptorSchema = zod
	.object({
		language: AbstractLanguageTag,
		lemmaKind: LemmaKind,
		lemmaSubKind: LemmaSubKind,
		surfaceKind: SurfaceKind,
	})
	.strict() as unknown as z.ZodType<AbstractDescriptor<"Selection">>;

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
