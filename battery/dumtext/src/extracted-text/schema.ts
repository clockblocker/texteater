/**
 * The Extracted Text schema in Zod, for a host that checks a stored or
 * extractor-made Extracted Text, or asks a model for one as JSON Schema.
 * Like Dumrel's `dumrel/schema`, it is to be a Zod schema entrypoint of its
 * own (system ADR 0013), published once a host reads it (#1178, #419):
 * no other production file imports it, so Dumtext's root loads no Zod.
 * The schema's output type is `ExtractedText` exactly.
 */
import type { Assert, Equal, PrettifyDeep } from "common-utils";
import { z } from "zod";
import type { ExtractedText, Scroll, Section } from "./extracted-text.js";

const fraction = z.number().min(0).max(1);

const originalLocationSchema = z.discriminatedUnion("kind", [
	z
		.object({
			kind: z.literal("PageArea"),
			page: z.int().min(0),
			area: z
				.object({
					x: fraction,
					y: fraction,
					width: fraction,
					height: fraction,
				})
				.readonly()
				.optional(),
		})
		.readonly(),
	z
		.object({
			kind: z.literal("TimeSpan"),
			startMs: z.int().min(0),
			endMs: z.int().min(0),
		})
		.readonly(),
	z
		.object({ kind: z.literal("FileSpot"), spot: z.string().min(1) })
		.readonly(),
]);

const locations = z.array(originalLocationSchema).min(1).readonly().optional();

const runSchema = z
	.object({
		kind: z.literal("Run"),
		text: z.string().regex(/^[^\r\n]+$/u),
		styles: z
			.array(z.enum(["Italic", "Bold", "Quotation"]))
			.min(1)
			.readonly()
			.optional(),
		locations,
	})
	.readonly();

const runs = z.array(runSchema).min(1).readonly();

const blockSchema = z.discriminatedUnion("kind", [
	z
		.object({
			kind: z.literal("Heading"),
			level: z.union([
				z.literal(2),
				z.literal(3),
				z.literal(4),
				z.literal(5),
				z.literal(6),
			]),
			runs,
			locations,
		})
		.readonly(),
	z
		.object({
			kind: z.literal("Paragraph"),
			inlines: z
				.array(
					z.discriminatedUnion("kind", [
						runSchema,
						z.object({ kind: z.literal("LineBreak") }).readonly(),
					]),
				)
				.min(1)
				.readonly(),
			locations,
		})
		.readonly(),
	z.object({ kind: z.literal("SceneBreak") }).readonly(),
]);

/** A Scroll of an Extracted Text, as `extracted-text.ts` documents it. */
export const scrollSchema = z
	.object({
		kind: z.literal("Scroll"),
		heading: z.object({ runs, locations }).readonly().optional(),
		blocks: z.array(blockSchema).readonly(),
	})
	.readonly();

const sectionSchema: z.ZodType<Section> = z
	.object({
		kind: z.literal("Section"),
		title: z.string().regex(/^\S(?:[^\r\n]*\S)?$/u),
		get contents() {
			return contents;
		},
	})
	.readonly();

const contents = z
	.array(z.union([sectionSchema, scrollSchema]))
	.min(1)
	.readonly();

/** An Extracted Text, as `extracted-text.ts` documents it. */
export const extractedTextSchema = z.object({ contents }).readonly();

type _ScrollSchemaIsTheType = Assert<
	Equal<PrettifyDeep<z.output<typeof scrollSchema>>, PrettifyDeep<Scroll>>
>;
type _SchemaIsTheType = Assert<
	Equal<
		PrettifyDeep<z.output<typeof extractedTextSchema>>,
		PrettifyDeep<ExtractedText>
	>
>;
