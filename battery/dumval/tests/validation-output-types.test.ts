import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
	compileZodValidationArtifacts,
	emitValidationOutputTypes,
} from "../src/compiler.js";

test("emitted types preserve recursive, optional, tuple, and empty-object values", async () => {
	const text = z.string();
	const trimOptional = (value: string | undefined) => value?.trim();
	const node = z.strictObject({
		label: z.string().optional().nullable(),
		alias: z.union([z.string(), z.number().optional()]),
		normalized: z.string().optional().transform(trimOptional),
		features: z.strictObject({}),
		pair: z.tuple([text, text], text),
		get children() {
			return z.array(node);
		},
	});
	const source = emitValidationOutputTypes({
		artifact: compileZodValidationArtifacts({
			schemas: { node },
			operations: [
				{
					construct: "transform",
					implementation: trimOptional,
					name: "example.trim-optional",
					version: 1,
				},
			],
		}),
		exports: { Node: "node" },
		typePreservingOperations: ["example.trim-optional"],
	});
	const directory = await mkdtemp(join(tmpdir(), "codegen-output-"));
	try {
		await writeFile(join(directory, "output.ts"), source);
		await writeFile(
			join(directory, "consumer.ts"),
			`
import type { Node } from "./output.js";
const leaf: Node = {features: {}, pair: ["leaf", "one"], children: []};
const parent: Node = {label: "parent", features: {}, pair: ["parent", "two", "rest"], children: [leaf]};
// @ts-expect-error Recursive children retain the same shape.
const invalidChild: Node = {...parent, children: [123]};
// @ts-expect-error A strict empty object cannot be a primitive.
const invalidFeatures: Node = {...leaf, features: 123};
// @ts-expect-error Tuples retain their minimum length.
const invalidPair: Node = {...leaf, pair: ["leaf"]};
// @ts-expect-error Optional does not erase the value type.
const invalidLabel: Node = {...leaf, label: 123};
`,
		);
		const child = Bun.spawn(
			[
				process.execPath,
				fileURLToPath(
					new URL(
						"../../../node_modules/typescript/bin/tsc",
						import.meta.url,
					),
				),
				"--noEmit",
				"--strict",
				"--skipLibCheck",
				"--module",
				"ESNext",
				"--moduleResolution",
				"Bundler",
				join(directory, "consumer.ts"),
			],
			{ cwd: directory, stdout: "pipe", stderr: "pipe" },
		);
		const [output, error, exit] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		expect(exit, output + error).toBe(0);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 30_000);

test("output emission refuses an operation without an explicit type contract", () => {
	const length = (value: string) => value.length;
	const artifact = compileZodValidationArtifacts({
		schemas: { length: z.string().transform(length) },
		operations: [
			{
				construct: "transform",
				implementation: length,
				name: "example.length",
				version: 1,
			},
		],
	});
	expect(() =>
		emitValidationOutputTypes({
			artifact,
			exports: { Length: "length" },
			typePreservingOperations: [],
		}),
	).toThrow("No output-type contract for example.length");
});

test("emitted types reference exported and externally owned shapes by name and inline the rest", () => {
	const point = z.strictObject({ x: z.number(), y: z.number() });
	const label = z.strictObject({ text: z.string() });
	const segment = z.strictObject({ from: point, to: point, label });
	const source = emitValidationOutputTypes({
		artifact: compileZodValidationArtifacts({
			schemas: { segment, label },
			operations: [],
		}),
		exports: { Segment: "segment", Label: "label" },
		typePreservingOperations: [],
		external: [
			{
				import: 'import type * as Geometry from "geometry";',
				artifact: compileZodValidationArtifacts({
					schemas: { point },
					operations: [],
				}),
				types: { point: "Geometry.Point" },
				typePreservingOperations: [],
			},
			{
				import: 'import type * as Unused from "unused";',
				artifact: compileZodValidationArtifacts({
					schemas: { point, flag: z.boolean() },
					operations: [],
				}),
				types: { point: "Unused.Point", flag: "Unused.Flag" },
				typePreservingOperations: [],
			},
		],
	});
	expect(source).toBe(
		[
			'import type * as Geometry from "geometry";',
			'export type Segment = {"from": Geometry.Point; "to": Geometry.Point; "label": Label;};',
			'export type Label = {"text": string;};',
		].join("\n"),
	);
});

test("output emission refuses a recursive shape without an export name", () => {
	const node = z.strictObject({
		get children() {
			return z.array(node);
		},
	});
	const tree = z.strictObject({ root: node });
	expect(() =>
		emitValidationOutputTypes({
			artifact: compileZodValidationArtifacts({
				schemas: { tree },
				operations: [],
			}),
			exports: { Tree: "tree" },
			typePreservingOperations: [],
		}),
	).toThrow(/Recursive output type .* needs an export name/);
});

test("a recursive shape another artifact owns is referenced by its name", () => {
	const node = z.strictObject({
		label: z.string(),
		get children() {
			return z.array(node);
		},
	});
	const tree = z.strictObject({ root: node });
	const source = emitValidationOutputTypes({
		artifact: compileZodValidationArtifacts({
			schemas: { tree },
			operations: [],
		}),
		exports: { Tree: "tree" },
		typePreservingOperations: [],
		external: [
			{
				import: 'import type * as Trees from "trees";',
				artifact: compileZodValidationArtifacts({
					schemas: { unrelated: z.string(), node },
					operations: [],
				}),
				types: { node: "Trees.Node" },
				typePreservingOperations: [],
			},
		],
	});
	expect(source).toBe(
		[
			'import type * as Trees from "trees";',
			'export type Tree = {"root": Trees.Node;};',
		].join("\n"),
	);
});
