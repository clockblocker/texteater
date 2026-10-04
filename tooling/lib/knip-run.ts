/**
 * Runs knip once over the whole repository with `tooling/knip.config.ts` and
 * returns its JSON report with one more pass folded in: names a package's
 * public entry points export that nothing outside the package uses
 * (`tooling/lib/knip-public-surface.ts`).
 */
import { join, relative, sep } from "node:path";
import type { KnipReport } from "./knip";
import type { ModuleGraph, PublicPackage } from "./knip-public-surface";
import { publicEntryFiles, unusedPublicExports } from "./knip-public-surface";
import type { Workspace } from "./workspaces";

interface ReportedIssue {
	filePath: string;
	symbol: string;
	symbols?: { symbol: string }[];
}

type IssueRecords = Record<string, Record<string, ReportedIssue>>;

interface KnipRunResult {
	results: { issues: Record<string, IssueRecords> };
	session: { getGraph(): ModuleGraph } | undefined;
}

type ReportRow = KnipReport["issues"][number];

export async function runKnip(
	repositoryRoot: string,
	workspaces: Workspace[],
): Promise<KnipReport> {
	// These register Bun plugins that patch knip's modules as they load, so
	// they come first and the knip imports below stay dynamic.
	await import("./knip-convex-condition");
	await import("./knip-esbuild-entries");
	const { createOptions } = await import("knip/session");
	// Knip exports no way to read its module graph; `run` with a session is
	// what `knip/session` builds on.
	const runModule = join(repositoryRoot, "node_modules/knip/dist/run.js");
	const { run } = (await import(runModule)) as {
		run(options: unknown): Promise<KnipRunResult>;
	};
	const options = await createOptions({
		cwd: repositoryRoot,
		isSession: true,
		args: {
			config: join(repositoryRoot, "tooling/knip.config.ts"),
			"no-config-hints": true,
			"no-progress": true,
		},
	});
	const { results, session } = await run(options);
	if (!session) throw new Error("knip returned no module graph");

	const rows = new Map<string, ReportRow>();
	const rowOf = (file: string) => {
		let row = rows.get(file);
		if (!row) {
			row = { file };
			rows.set(file, row);
		}
		return row;
	};
	const add = (file: string, type: string, item: unknown) => {
		const row = rowOf(file);
		row[type] ??= [];
		(row[type] as unknown[]).push(item);
	};
	for (const [type, included] of Object.entries(options.includedIssueTypes)) {
		if (!included) continue;
		for (const byFile of Object.values(results.issues[type] ?? {})) {
			for (const issue of Object.values(byFile)) {
				const file = relative(repositoryRoot, issue.filePath)
					.split(sep)
					.join("/");
				add(
					file,
					type,
					(type === "duplicates" || type === "cycles") &&
						issue.symbols
						? issue.symbols.map(({ symbol }) => ({ name: symbol }))
						: { name: issue.symbol },
				);
			}
		}
	}

	const packages: PublicPackage[] = workspaces.map(({ dir, manifest }) => ({
		dir,
		entries: publicEntryFiles(dir, manifest),
	}));
	for (const finding of unusedPublicExports(
		session.getGraph(),
		packages,
		repositoryRoot,
	)) {
		add(finding.file, finding.type, { name: finding.name });
	}
	return { issues: [...rows.values()] };
}
