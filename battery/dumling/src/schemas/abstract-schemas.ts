import type { z } from "zod";
import { z as zod } from "zod";
import {
	lemmaFamilyValues,
	lemmaKindValues,
	surfaceKindValues,
} from "../types/core/enums.js";
import type {
	AbstractAttestation,
	AbstractLemma,
	AbstractLemmaKindFor,
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

type AbstractAttestationDescriptor = AbstractSurfaceDescriptor;

type AbstractDescriptor<K extends EntityKind> = K extends "Lemma"
	? AbstractLemmaDescriptor
	: K extends "Surface"
		? AbstractSurfaceDescriptor
		: AbstractAttestationDescriptor;

type AbstractSchemaRegistry = {
	descriptor: {
		[K in EntityKind]: z.ZodType<AbstractDescriptor<K>>;
	};
	entity: {
		Lemma: z.ZodType<AbstractLemma<string>>;
		Surface: z.ZodType<AbstractSurface<string>>;
		Attestation: z.ZodType<AbstractAttestation<string>>;
	};
};

const abstractLemmaDescriptorSchema = zod.strictObject({
	language: zod.string().min(1),
	family: zod.enum(lemmaFamilyValues),
	kind: zod.enum(lemmaKindValues),
}) as unknown as z.ZodType<AbstractDescriptor<"Lemma">>;

const abstractSurfaceDescriptorSchema = zod.strictObject({
	language: zod.string().min(1),
	family: zod.enum(lemmaFamilyValues),
	kind: zod.enum(lemmaKindValues),
	surfaceKind: zod.enum(surfaceKindValues),
}) as unknown as z.ZodType<AbstractDescriptor<"Surface">>;

const abstractAttestationDescriptorSchema = zod.strictObject({
	language: zod.string().min(1),
	family: zod.enum(lemmaFamilyValues),
	kind: zod.enum(lemmaKindValues),
	surfaceKind: zod.enum(surfaceKindValues),
}) as unknown as z.ZodType<AbstractDescriptor<"Attestation">>;

export const abstractSchemas = {
	entity: {
		Lemma: abstractRuntimeSchemas.lemma,
		Surface: abstractRuntimeSchemas.surface,
		Attestation: abstractRuntimeSchemas.attestation,
	},
	descriptor: {
		Lemma: abstractLemmaDescriptorSchema,
		Surface: abstractSurfaceDescriptorSchema,
		Attestation: abstractAttestationDescriptorSchema,
	},
} satisfies AbstractSchemaRegistry;
