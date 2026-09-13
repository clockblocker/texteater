import { afterAll, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
	closeTestingSessions,
	inferredCompletions,
	inferredType,
} from "prinfer/testing";

afterAll(closeTestingSessions);
const fixture = new URL("./schema-consumer.ts", import.meta.url).href;
const lines = (await readFile(new URL(fixture), "utf8")).split("\n");
async function completions(marker: string) {
	const index = lines.findIndex((line) =>
		line.endsWith(`// completions:${marker}`),
	);
	const line = lines[index];
	if (!line) throw Error(`Missing completion fixture: ${marker}`);
	const column = line.indexOf(".shape.") + ".shape.".length + 1;
	return (
		await inferredCompletions(fixture, {
			line: index + 1,
			column,
			backend: "typescript7",
		})
	).sort();
}

test("concrete schema imports offer only their applicable fields", async () => {
	expect(await completions("noun")).toEqual([
		"inflectionalFeatures",
		"language",
		"lemma",
		"normalizedSurface",
		"spelling",
		"surfaceFeatures",
		"unitKind",
	]);
	expect(await completions("prefix")).toEqual([
		"language",
		"lemma",
		"normalizedSurface",
		"spelling",
		"surfaceFeatures",
		"unitKind",
	]);
	expect(await completions("reading")).toEqual([
		"emojiDescription",
		"lemma",
		"unitKind",
	]);
}, 30_000);

test("schema output types retain route-specific features and composition", async () => {
	expect(
		await inferredType(fixture, {
			name: "NounFeatures",
			full: true,
			backend: "typescript7",
		}),
	).toMatchInlineSnapshot(
		`"type NounFeatures = { case: "Acc" | "Dat" | "Gen" | "Nom" | null; number: "Plur" | "Sing" | null; } | null"`,
	);
	expect(
		await inferredType(fixture, {
			name: "ReadingCore",
			full: true,
			backend: "typescript7",
		}),
	).toMatchInlineSnapshot(`"type ReadingCore = { abbr: "Yes" | null; }"`);
	expect(
		await inferredType(fixture, {
			name: "ModelKind",
			full: true,
			backend: "typescript7",
		}),
	).toMatchInlineSnapshot(`"type ModelKind = "ADJ""`);
}, 30_000);
