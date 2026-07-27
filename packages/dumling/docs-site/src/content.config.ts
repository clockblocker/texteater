import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const pageSchema = z.object({
	description: z.string().optional(),
	generatedFrom: z.string().optional(),
	navTitle: z.string().optional(),
	order: z.number().default(0),
	routeId: z.string().optional(),
	title: z.string(),
});

const docs = defineCollection({
	loader: glob({
		base: "./src/generated/docs",
		pattern: "**/*.md",
	}),
	schema: pageSchema,
});

const entities = defineCollection({
	loader: glob({
		base: "./src/generated/entities",
		pattern: "**/*.md",
	}),
	schema: pageSchema,
});

export const collections = { docs, entities };
