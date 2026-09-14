import { expect, test } from "bun:test";
import { join } from "node:path";
import {
	DUM_ENTRYPOINTS,
	DUM_PACKAGE_PATHS,
	operationalEntrypoints,
} from "../dum-entrypoint-rss/inventory";
import { median, summarizeSamples } from "../dum-entrypoint-rss/measurement";
import { runRepresentativeOperation } from "../dum-entrypoint-rss/operations";
import { findRepositoryRoot } from "../lib/workspaces";

const packages = Object.keys(
	DUM_PACKAGE_PATHS,
) as (keyof typeof DUM_PACKAGE_PATHS)[];

test("every published dum* entrypoint has an explicit RSS-audit classification", async () => {
	const root = await findRepositoryRoot(import.meta.dir);
	const published = await Promise.all(
		packages.map(async (packageName) => {
			const manifest = await Bun.file(
				join(
					root,
					"battery",
					DUM_PACKAGE_PATHS[packageName],
					"package.json",
				),
			).json();
			return Object.keys(manifest.exports).map((subpath) =>
				subpath === "."
					? packageName
					: `${packageName}${subpath.slice(1)}`,
			);
		}),
	);

	expect(DUM_ENTRYPOINTS.map(({ specifier }) => specifier).sort()).toEqual(
		published.flat().sort(),
	);
});

test("every operational entrypoint defines a representative operation", () => {
	for (const entrypoint of operationalEntrypoints()) {
		expect(entrypoint.operation).toEqual({
			id: expect.any(String),
			description: expect.any(String),
		});
	}
});

test("schema and model-authoring surfaces are explicitly exempt", () => {
	const schemaAuthoringSurfaces = DUM_ENTRYPOINTS.filter(
		({ classification }) => classification === "schema-authoring-exempt",
	).map(({ specifier }) => specifier);
	expect(schemaAuthoringSurfaces).toEqual([
		"dumling/schema/*",
		"dumrel/schema",
		"dumdict/schema",
		"dumgen/schemas",
		"dumgen/development",
		"dumval/compiler",
	]);
	const documentedInventory = schemaAuthoringSurfaces
		.map((specifier) => `\`${specifier}\``)
		.join(", ");
	return expect(
		Bun.file(
			new URL(
				"../../docs/benchmarks/dum-operational-entrypoint-rss-baseline.md",
				import.meta.url,
			),
		).text(),
	).resolves.toContain(
		`The explicit schema/model-authoring escape hatches are ${documentedInventory}.`,
	);
});

test("every representative operation reaches its published runtime surface", async () => {
	for (const entrypoint of operationalEntrypoints()) {
		const publicModule = await import(entrypoint.specifier);
		await expect(
			runRepresentativeOperation(entrypoint.operation.id, publicModule),
		).resolves.toBeUndefined();
	}
});

test("RSS samples use the five-process median and the empty-module delta", () => {
	expect(median([9, 1, 7, 3, 5])).toBe(5);
	expect(
		summarizeSamples([20, 24, 22, 21, 23], [10, 14, 12, 11, 13], 1),
	).toEqual({
		baselineMedianBytes: 12,
		deltaBytes: 10,
		deltaMiB: 10,
		medianBytes: 22,
		samplesBytes: [20, 24, 22, 21, 23],
	});
});

test("the frozen baseline retains five raw processes for both operational measurements", async () => {
	const root = await findRepositoryRoot(import.meta.dir);
	const report = await Bun.file(
		join(
			root,
			"docs",
			"benchmarks",
			"dum-operational-entrypoint-rss-baseline.json",
		),
	).json();

	expect(report.contract).toMatchObject({
		baseline: "empty imported Bun module",
		isolatedRss: "diagnostic",
		processesPerMeasurement: 5,
		statistic: "median max RSS delta",
	});
	expect(report.baseline.samplesBytes).toHaveLength(5);
	expect(report.shared.samples).toHaveLength(7);
	expect(report.shared.budgetBytes).toBe(30 * 1024 * 1024);
	const measured = report.entrypoints.filter(
		(entrypoint: { classification: string }) =>
			entrypoint.classification === "operational",
	);
	expect(
		measured.map(({ specifier }: { specifier: string }) => specifier),
	).toEqual(operationalEntrypoints().map(({ specifier }) => specifier));
	for (const entrypoint of measured) {
		expect(entrypoint.importOnly.samplesBytes).toHaveLength(5);
		expect(entrypoint.importPlusOperation.samplesBytes).toHaveLength(5);
	}
});
