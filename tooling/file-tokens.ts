/**
 * `bun run check:file-tokens`: fails when a staged file is over 5,000 tokens,
 * counting 4 bytes of staged content as a token. `.githooks/pre-commit` runs
 * it on every commit.
 *
 * Only files agents author count. Binary files are skipped, and so are paths
 * `.gitattributes` marks `linguist-generated` (lockfiles, codegen, run
 * output) or `linguist-vendored` (installed skills, third-party references).
 * Gold records (`battery/dumcorpus/records/**\/*.json`) are skipped too: they
 * are data, one record is one sentence and can't be split, and the limit
 * protects hand-written code. `exemptPaths` in `./lib/file-tokens` lists them.
 * Bun runs a package script in its package's directory: at the repository
 * root every staged file counts, and inside a workspace only that
 * workspace's do.
 */
import { stagedAuthoredFiles, tokenLimit } from "./lib/file-tokens";

if (process.argv.length > 2) {
	console.error("Usage: bun run check:file-tokens");
	process.exit(2);
}

const oversized = (await stagedAuthoredFiles(process.cwd())).filter(
	(file) => file.tokens > tokenLimit,
);
if (oversized.length > 0) {
	console.error(
		`Staged files over ${tokenLimit.toLocaleString("en")} tokens (bytes / 4):`,
	);
	for (const file of oversized) {
		console.error(`- ${file.path} (${file.tokens.toLocaleString("en")})`);
	}
	console.error(
		"\nSplit each into smaller files. If a file is generated, a lockfile or vendored, mark it linguist-generated or linguist-vendored in .gitattributes.",
	);
	process.exit(1);
}
