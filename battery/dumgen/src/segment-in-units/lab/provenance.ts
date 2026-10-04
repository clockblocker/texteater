/**
 * What a lab run pins so its numbers can be traced to the code, gold, Rules,
 * prompts and model that produced them: the run manifest. `run` and
 * `noise` write one, beside the run's outcomes and summary, under
 * `evidence/segment-in-units-lab/runs/<runId>/`.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { authoredRealizations, rules } from "dumspec";
import { hashOf, type TransportRecord } from "./jev-cache.js";
import type { Pin } from "./round.js";

/**
 * The Dumgen sources a lab run executes, relative to the package root: the
 * production segmenter the arms configure, the arms and lab, the #731
 * harness they score with, and the CLI. Their per-file hashes make the
 * manifest's `codeHash`.
 */
export const labSources = [
	"src/segment",
	"src/segment-in-units",
	"src/evaluation/spec-corpus",
	"tsconfig.segment-in-units.json",
] as const;

/**
 * The repository paths whose uncommitted changes make a run dirty. dumspec's
 * records are left out: a run reads the frozen set, whose hash the manifest
 * keeps, and the records change under a concurrent review.
 */
export const dirtyScope = (cli: string) => [
	"battery/dumgen/src/segment",
	"battery/dumgen/src/segment-in-units",
	"battery/dumgen/src/evaluation/spec-corpus",
	"battery/dumgen/tsconfig.segment-in-units.json",
	`battery/dumgen/${cli}`,
	"battery/dumspec/src",
];

const sha256 = (contents: string | Uint8Array) =>
	createHash("sha256").update(contents).digest("hex");

async function filesUnder(root: string, path: string): Promise<string[]> {
	const absolute = join(root, path);
	if (!(await stat(absolute)).isDirectory()) return [path];
	const entries = await readdir(absolute, {
		recursive: true,
		withFileTypes: true,
	});
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => relative(root, join(entry.parentPath, entry.name)));
}

/** SHA-256 of every file under `paths` (files or directories), by relative path. */
export async function sourceHashes(
	root: string,
	paths: readonly string[],
): Promise<Record<string, string>> {
	const files = (
		await Promise.all(paths.map((path) => filesUnder(root, path)))
	)
		.flat()
		.sort();
	const hashes: Record<string, string> = {};
	for (const file of files)
		hashes[file] = sha256(await readFile(join(root, file)));
	return hashes;
}

/** One hash over per-file hashes; it changes when any file's contents or path does. */
export const codeHashOf = (hashes: Readonly<Record<string, string>>) =>
	hashOf(hashes);

export type GitState = {
	readonly gitHead: string;
	/** `git status --porcelain` lines inside the scope; empty when clean. */
	readonly dirty: readonly string[];
	/** Tracked changes against HEAD plus untracked files, when dirty. */
	readonly patch: string;
};

/** HEAD and the uncommitted changes inside `scope` (repository-relative paths). */
export function gitState(
	repository: string,
	scope: readonly string[],
): GitState {
	const git = (args: readonly string[]) =>
		execFileSync("git", args, {
			cwd: repository,
			encoding: "utf8",
			maxBuffer: 1 << 28,
		});
	const gitHead = git(["rev-parse", "HEAD"]).trim();
	const dirty = git(["status", "--porcelain", "--", ...scope])
		.split("\n")
		.filter(Boolean);
	if (dirty.length === 0) return { gitHead, dirty, patch: "" };
	const tracked = git(["diff", "HEAD", "--", ...scope]);
	const untracked = git([
		"ls-files",
		"--others",
		"--exclude-standard",
		"--",
		...scope,
	])
		.split("\n")
		.filter(Boolean)
		.map((path) => {
			try {
				return git(["diff", "--no-index", "--", "/dev/null", path]);
			} catch (error) {
				// `git diff --no-index` exits 1 when the files differ.
				const stdout = (error as { stdout?: string }).stdout;
				if (typeof stdout === "string") return stdout;
				throw error;
			}
		});
	return { gitHead, dirty, patch: [tracked, ...untracked].join("") };
}

/**
 * The dumspec the arms import, as it runs: `sourceHash` covers the source
 * Bun resolves the package to (Rules, inventories and the ADP Case Table);
 * `rulesHash` and `realizationsHash` name the two data sets the prompts
 * quote.
 */
export async function dumspecFingerprint(): Promise<{
	readonly sourceHash: string;
	readonly rulesHash: string;
	readonly realizationsHash: string;
}> {
	const sourceDirectory = dirname(
		fileURLToPath(import.meta.resolve("dumspec")),
	);
	const files = (await readdir(sourceDirectory, { recursive: true }))
		.filter((file) => file.endsWith(".ts"))
		.sort();
	const hashes: Record<string, string> = {};
	for (const file of files)
		hashes[file] = sha256(await readFile(join(sourceDirectory, file)));
	return {
		sourceHash: hashOf(hashes),
		rulesHash: hashOf(rules),
		realizationsHash: hashOf(authoredRealizations),
	};
}

export type RunManifest = {
	readonly runId: string;
	/** `run` or `noise`; the retired ownership pilot wrote `pilot`. */
	readonly kind: string;
	readonly createdAt: string;
	readonly parent: string | null;
	readonly hypothesis: string | null;
	readonly gitHead: string;
	readonly dirty: boolean;
	readonly dirtyFiles: readonly string[];
	readonly codeHash: string;
	readonly sourceHashes: Readonly<Record<string, string>>;
	readonly dumspecHash: string;
	readonly dumspec: Awaited<ReturnType<typeof dumspecFingerprint>>;
	/** Per stage, one hash over every distinct request (state and questions) sent. */
	readonly promptHashes: Readonly<Record<string, string>>;
	readonly modelRequested: string;
	/** Every model the service answered as; one entry for a pinned run. */
	readonly modelResolved: readonly string[];
	readonly arm: string;
	readonly options: Readonly<Record<string, string>>;
	/** The policy the run's headline numbers use. */
	readonly primary: string;
	readonly set: { readonly name: string; readonly hash: string };
	readonly subset: string;
	/** `--limit`: the subset's first cases only. */
	readonly limit: number | null;
	readonly cases: number;
	readonly repetitions: number;
	/** Added to every repetition index; nonzero for a noise rerun. */
	readonly repetitionOffset: number;
	/** The run a noise rerun repeats. */
	readonly baseline?: string;
	/** The experiment round the run's spend counts against; absent before rounds (#845). */
	readonly round?: string;
	/** The dumspec state the run's requests were built from; absent before rounds. */
	readonly pin?: Pin;
	/**
	 * What the fresh requests met, apart from the accuracy: retries and
	 * requests that still failed, by cause. Absent before #858's follow-up.
	 */
	readonly transport?: TransportRecord;
	readonly extra?: Readonly<Record<string, unknown>>;
};

/** The provenance half of a manifest, taken before the run starts. */
export async function provenanceOf(args: {
	readonly packageRoot: string;
	readonly repository: string;
	/** The CLI file, relative to the package root. */
	readonly cli: string;
}): Promise<
	Pick<
		RunManifest,
		| "gitHead"
		| "dirty"
		| "dirtyFiles"
		| "codeHash"
		| "sourceHashes"
		| "dumspecHash"
		| "dumspec"
	> & { readonly patch: string }
> {
	const hashes = await sourceHashes(args.packageRoot, [
		...labSources,
		args.cli,
	]);
	const state = gitState(args.repository, dirtyScope(args.cli));
	const dumspec = await dumspecFingerprint();
	return {
		gitHead: state.gitHead,
		dirty: state.dirty.length > 0,
		dirtyFiles: state.dirty,
		codeHash: codeHashOf(hashes),
		sourceHashes: hashes,
		dumspecHash: hashOf(dumspec),
		dumspec,
		patch: state.patch,
	};
}
