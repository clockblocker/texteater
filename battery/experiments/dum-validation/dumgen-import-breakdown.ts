import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";

// Destructive ablations apply only to a temporary published-package copy. These
// variants intentionally break features and are never eligible for adoption.
const destination = Bun.argv[2];
if (!destination)
	throw new Error("Usage: bun dumgen-import-breakdown.ts OUTPUT.json");
const root = await preparePublishedRuntime(
	resolve(import.meta.dir, "../../.."),
);
const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
type Usage = { peak: number; rss: number; heapUsed: number };
type Sample = {
	before: Usage;
	after: Usage;
	afterGc: Usage;
	elapsedMs: number;
};

try {
	const path = join(root, "node_modules/dumgen/dist/index.js");
	const original = await readFile(path, "utf8");
	if (
		!original.includes('from "effect/Effect"') ||
		!/function defineAuthoredMember\(\w+\) \{\s*return freeze\(\w+\);/.test(
			original,
		)
	)
		throw new Error(
			"Expected current build with narrow Effect and catalog validation removed from startup.",
		);
	function section(
		source: string,
		start: string,
		replacement: string,
		end?: string,
	) {
		const a = source.indexOf(start);
		const b = end
			? source.indexOf(end, a + start.length)
			: source.indexOf("\n// ", a + start.length);
		if (a < 0 || b < a) throw new Error(`Ablation patch drift: ${start}`);
		return source.slice(0, a) + replacement + "\n" + source.slice(b);
	}
	const catalog = (s: string) =>
		section(
			s,
			"// src/concrete-lang/de/authored-closed-sets/member.ts",
			"var authoredMembers = [];",
			"// src/concrete-lang/de/authored-closed-sets/select.ts",
		);
	const prompts = (s: string) =>
		section(
			s,
			"// src/generated/prompts.ts",
			"var prompts = {}; var grammarPromptRoutes = {};",
		);
	const schemas = (s: string) =>
		section(
			s,
			"// src/generated/model-schemas.ts",
			"var modelSchemas = {};",
		);
	const validation = (s: string) =>
		section(
			s,
			"// src/generated/validation.ts",
			'var encodedValidation = "{}";',
		);
	const segmenters = (s: string) =>
		s.replace(/new Intl\.Segmenter\([^;\n]+\)/g, "undefined");
	const noFreeze = (s: string) =>
		s.replace(
			/function defineAuthoredMember\((\w+)\) \{\s*return freeze\(\w+\);\s*\}/,
			"function defineAuthoredMember($1) { return $1; }",
		);
	const variants = [
		{ id: "baseline", source: original },
		{ id: "without-segmenter-construction", source: segmenters(original) },
		{ id: "without-catalog-freezing", source: noFreeze(original) },
		{ id: "without-catalog", source: catalog(original) },
		{ id: "without-prompts", source: prompts(original) },
		{ id: "without-model-schemas", source: schemas(original) },
		{ id: "without-validation-tables", source: validation(original) },
		{
			id: "without-generated-data",
			source: validation(schemas(prompts(catalog(original)))),
		},
		{
			id: "without-generated-data-or-segmenters",
			source: segmenters(validation(schemas(prompts(catalog(original))))),
		},
	];
	for (const variant of variants.slice(1))
		if (variant.source === original)
			throw new Error(`No-op ablation: ${variant.id}`);
	await writeFile(
		join(root, "breakdown.mjs"),
		`
for(const name of ["effect/Effect","dumling","dumrel","dumdict/runtime"]) await import(name);
function usage(){const m=process.memoryUsage();return {peak:process.resourceUsage().maxRSS*1024,rss:m.rss,heapUsed:m.heapUsed};}
const before=usage(),start=performance.now();
await import("dumgen");
const elapsedMs=performance.now()-start,after=usage();
Bun.gc(true);const afterGc=usage();
console.log(JSON.stringify({before,after,afterGc,elapsedMs}));
`,
	);
	const samples = new Map<string, Sample[]>(variants.map((v) => [v.id, []]));
	// Rotate order between rounds to avoid confounding each variant with time.
	for (let round = 0; round < 7; round++) {
		for (let offset = 0; offset < variants.length; offset++) {
			const variant = variants[(round + offset) % variants.length]!;
			await writeFile(path, variant.source);
			const child = Bun.spawn(
				[process.execPath, join(root, "breakdown.mjs")],
				{ cwd: root, stdout: "pipe", stderr: "pipe" },
			);
			const [stdout, stderr, exit] = await Promise.all([
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
				child.exited,
			]);
			if (exit !== 0) throw new Error(`${variant.id}: ${stderr}`);
			samples.get(variant.id)!.push(JSON.parse(stdout));
		}
	}
	const results = variants.map((variant) => {
		const raw = samples.get(variant.id)!;
		return {
			id: variant.id,
			bundleBytes: Buffer.byteLength(variant.source),
			addedPeakMiB: median(
				raw.map((s) => (s.after.peak - s.before.peak) / 1048576),
			),
			addedRssMiB: median(
				raw.map((s) => (s.after.rss - s.before.rss) / 1048576),
			),
			addedHeapMiB: median(
				raw.map(
					(s) => (s.after.heapUsed - s.before.heapUsed) / 1048576,
				),
			),
			totalHeapAfterGcMiB: median(
				raw.map((s) => s.afterGc.heapUsed / 1048576),
			),
			importMs: median(raw.map((s) => s.elapsedMs)),
			samples: raw,
		};
	});
	await writeFile(
		resolve(destination),
		`${JSON.stringify(
			{
				capturedAt: new Date().toISOString(),
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				bundleSha256: createHash("sha256")
					.update(original)
					.digest("hex"),
				method: "Seven fresh processes per variant with rotated variant order. Each preloads Effect, Dumling, Dumrel, and Dumdict/runtime. Forced GC happens only after measured import. Independent removals are not additive attribution: loading, compilation, allocation, and GC interact.",
				limitations:
					"Ablations deliberately disable features. Diagnostic only, no DX gate, no production edits. Local Bun published-package replay, not deployed tf-demo. Post-GC total heap includes preloaded libraries; it is not Dumgen retained heap alone.",
				results,
			},
			null,
			2,
		)}\n`,
	);
	console.log(
		JSON.stringify(
			results.map(({ samples: _, ...summary }) => summary),
			null,
			2,
		),
	);
} finally {
	await rm(root, { recursive: true, force: true });
}
