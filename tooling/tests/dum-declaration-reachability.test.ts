import { describe, expect, test } from "bun:test";
import { auditDumDeclarationReachability } from "../dum-declaration-reachability";
import type { DumEntryPoint } from "../dum-entrypoint-rss/inventory";
import { addWorkspace, temporaryRepository, writeSource } from "./helpers";

describe("Dum published declaration reachability", () => {
	test("rejects a forbidden package reached through a type-only relative declaration edge", async () => {
		const root = await temporaryRepository();
		const alpha = await addWorkspace(root, {
			exports: {
				".": {
					import: "./dist/index.js",
					types: "./dist/index.d.ts",
				},
				"./schema": {
					import: "./dist/schema.js",
					types: "./dist/schema.d.ts",
				},
			},
			kind: "battery",
			name: "alpha",
		});
		await writeSource(
			alpha,
			"dist/index.d.ts",
			'export type { PublicDto } from "./public-dto.js";\n',
		);
		await writeSource(
			alpha,
			"dist/public-dto.d.ts",
			'export type PublicDto = import("zod/v4").output<never>;\n',
		);
		await writeSource(
			alpha,
			"dist/schema.d.ts",
			'export type Schema = import("zod").ZodType;\n',
		);
		const inventory = [
			{
				classification: "operational",
				operation: { description: "fixture", id: "alpha.read" },
				rationale: "fixture",
				specifier: "alpha",
			},
			{
				classification: "schema-authoring-exempt",
				rationale: "fixture",
				specifier: "alpha/schema",
			},
		] as const satisfies readonly DumEntryPoint[];

		expect(
			await auditDumDeclarationReachability({
				entrypoints: inventory,
				repositoryRoot: root,
			}),
		).toEqual([
			{
				chain: [
					"alpha",
					"battery/alpha/dist/index.d.ts",
					"battery/alpha/dist/public-dto.d.ts",
					"zod/v4",
				],
				detail: 'forbidden declaration dependency "zod/v4"',
				entrypoint: "alpha",
				kind: "forbidden-dependency",
			},
		]);
	});

	test("follows declaration reference directives", async () => {
		const root = await temporaryRepository();
		const alpha = await addWorkspace(root, {
			exports: {
				".": {
					import: "./dist/index.js",
					types: "./dist/index.d.ts",
				},
			},
			kind: "battery",
			name: "alpha",
		});
		await writeSource(
			alpha,
			"dist/index.d.ts",
			'/// <reference path="./referenced.d.ts" />\n',
		);
		await writeSource(
			alpha,
			"dist/referenced.d.ts",
			'export type Codec = import("codec-builder-library/deep").Codec;\n',
		);
		const inventory = [
			{
				classification: "operational",
				operation: { description: "fixture", id: "alpha.read" },
				rationale: "fixture",
				specifier: "alpha",
			},
		] as const satisfies readonly DumEntryPoint[];

		expect(
			await auditDumDeclarationReachability({
				entrypoints: inventory,
				repositoryRoot: root,
			}),
		).toEqual([
			{
				chain: [
					"alpha",
					"battery/alpha/dist/index.d.ts",
					"battery/alpha/dist/referenced.d.ts",
					"codec-builder-library/deep",
				],
				detail: 'forbidden declaration dependency "codec-builder-library/deep"',
				entrypoint: "alpha",
				kind: "forbidden-dependency",
			},
		]);
	});

	test("rejects TypeScript external-module imports of forbidden deep targets", async () => {
		const root = await temporaryRepository();
		const alpha = await addWorkspace(root, {
			exports: {
				".": {
					import: "./dist/index.js",
					types: "./dist/index.d.ts",
				},
			},
			kind: "battery",
			name: "alpha",
		});
		await writeSource(
			alpha,
			"dist/index.d.ts",
			'import Zod = require("zod/v4/core");\nexport = Zod;\n',
		);
		const inventory = [
			{
				classification: "operational",
				operation: { description: "fixture", id: "alpha.read" },
				rationale: "fixture",
				specifier: "alpha",
			},
		] as const satisfies readonly DumEntryPoint[];

		expect(
			await auditDumDeclarationReachability({
				entrypoints: inventory,
				repositoryRoot: root,
			}),
		).toEqual([
			{
				chain: [
					"alpha",
					"battery/alpha/dist/index.d.ts",
					"zod/v4/core",
				],
				detail: 'forbidden declaration dependency "zod/v4/core"',
				entrypoint: "alpha",
				kind: "forbidden-dependency",
			},
		]);
	});

	test("audits type-only roots and rejects a deep workspace import of a schema-authoring entrypoint", async () => {
		const root = await temporaryRepository();
		const alpha = await addWorkspace(root, {
			exports: {
				"./types": {
					import: "./dist/types.js",
					types: "./dist/types.d.ts",
				},
			},
			kind: "battery",
			name: "alpha",
		});
		const beta = await addWorkspace(root, {
			exports: {
				"./schema": {
					import: "./dist/schema.js",
					types: "./dist/schema.d.ts",
				},
			},
			kind: "battery",
			name: "beta",
		});
		await writeSource(
			alpha,
			"dist/types.d.ts",
			'export type PublicDto = import("beta/schema").SchemaOutput;\n',
		);
		await writeSource(
			beta,
			"dist/schema.d.ts",
			"export type SchemaOutput = string;\n",
		);
		const inventory = [
			{
				classification: "type-only",
				rationale: "fixture",
				specifier: "alpha/types",
			},
			{
				classification: "schema-authoring-exempt",
				rationale: "fixture",
				specifier: "beta/schema",
			},
		] as const satisfies readonly DumEntryPoint[];

		expect(
			await auditDumDeclarationReachability({
				entrypoints: inventory,
				repositoryRoot: root,
			}),
		).toEqual([
			{
				chain: [
					"alpha/types",
					"battery/alpha/dist/types.d.ts",
					"battery/beta/dist/schema.d.ts",
					"beta/schema",
				],
				detail: 'declaration reaches schema-authoring entrypoint "beta/schema"',
				entrypoint: "alpha/types",
				kind: "schema-authoring-reachability",
			},
		]);
	});

	test("fails closed when relative or workspace declaration edges cannot be resolved", async () => {
		const root = await temporaryRepository();
		const alpha = await addWorkspace(root, {
			exports: {
				".": {
					import: "./dist/index.js",
					types: "./dist/index.d.ts",
				},
			},
			kind: "battery",
			name: "alpha",
		});
		await addWorkspace(root, {
			exports: {},
			kind: "battery",
			name: "beta",
		});
		await writeSource(
			alpha,
			"dist/index.d.ts",
			[
				'export type { Missing } from "./missing.js";',
				'export type { Private } from "beta/private";',
				"",
			].join("\n"),
		);
		const inventory = [
			{
				classification: "operational",
				operation: { description: "fixture", id: "alpha.read" },
				rationale: "fixture",
				specifier: "alpha",
			},
			{
				classification: "schema-authoring-exempt",
				rationale: "missing exempt output must not be audited",
				specifier: "beta/schema",
			},
			{
				classification: "metadata",
				rationale: "metadata has no declaration",
				specifier: "beta/package.json",
			},
		] as const satisfies readonly DumEntryPoint[];

		expect(
			await auditDumDeclarationReachability({
				entrypoints: inventory,
				repositoryRoot: root,
			}),
		).toEqual([
			{
				chain: [
					"alpha",
					"battery/alpha/dist/index.d.ts",
					"./missing.js",
				],
				detail: 'cannot resolve declaration import "./missing.js"',
				entrypoint: "alpha",
				kind: "unresolved-declaration",
			},
			{
				chain: [
					"alpha",
					"battery/alpha/dist/index.d.ts",
					"beta/private",
				],
				detail: 'cannot resolve declaration import "beta/private"',
				entrypoint: "alpha",
				kind: "unresolved-declaration",
			},
		]);
	});

	test("accepts clean declaration closure across relative and workspace edges", async () => {
		const root = await temporaryRepository();
		const alpha = await addWorkspace(root, {
			exports: {
				"./types": {
					import: "./dist/types.js",
					types: "./dist/types.d.ts",
				},
			},
			kind: "battery",
			name: "alpha",
		});
		const beta = await addWorkspace(root, {
			exports: {
				".": {
					import: "./dist/index.js",
					types: "./dist/index.d.ts",
				},
			},
			kind: "battery",
			name: "beta",
		});
		await writeSource(
			alpha,
			"dist/types.d.ts",
			'import type { DomainDto } from "beta";\nexport type PublicDto = DomainDto;\n',
		);
		await writeSource(
			beta,
			"dist/index.d.ts",
			'export type { DomainDto } from "./domain-dto.js";\n',
		);
		await writeSource(
			beta,
			"dist/domain-dto.d.ts",
			"export type DomainDto = Readonly<{ id: string }>;\n",
		);
		const inventory = [
			{
				classification: "type-only",
				rationale: "fixture",
				specifier: "alpha/types",
			},
			{
				classification: "operational",
				operation: { description: "fixture", id: "beta.read" },
				rationale: "fixture",
				specifier: "beta",
			},
		] as const satisfies readonly DumEntryPoint[];

		expect(
			await auditDumDeclarationReachability({
				entrypoints: inventory,
				repositoryRoot: root,
			}),
		).toEqual([]);
	});
});
