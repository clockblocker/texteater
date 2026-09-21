import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { assembleSystemPrompt } from "promptsmith";
import type { EvaluationExecutor } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import { evaluateGeneratedEmoji } from "../src/concrete-lang/de/reading-emoji-description/generate/cases.js";
import { evaluationCaseIds } from "../src/concrete-lang/de/reading-emoji-description/generate/evaluation-ids.js";
import { promptSource } from "../src/concrete-lang/de/reading-emoji-description/generate/prompt.js";
import { emojiDescriptionSchema } from "../src/generated/schemas.js";

// Paid, opt-in experiment for stochastic Reading failures. Each selected
// held-out case is sampled several times per prompt variant, so a failure that
// appears in one production call out of five is visible as a rate rather than
// hidden by one lucky evaluation run. Variant order rotates per sample.
const { values } = parseArgs({
	options: {
		baseline: { type: "string" },
		cases: { type: "string" },
		samples: { type: "string", default: "5" },
		concurrency: { type: "string", default: "4" },
		output: { type: "string" },
		model: { type: "string", default: "gpt-5.6-luna" },
	},
});
const samples = Number(values.samples);
const concurrency = Number(values.concurrency);
if (!Number.isSafeInteger(samples) || samples < 1)
	throw Error("--samples must be a positive integer");
if (!Number.isSafeInteger(concurrency) || concurrency < 1)
	throw Error("--concurrency must be a positive integer");
const prefix = "reading-generation-";
const selected = values.cases
	? values.cases
			.split(",")
			.map((id) => (id.startsWith(prefix) ? id : prefix + id))
	: [...evaluationCaseIds];
const corpus = promptSource.goldenCorpus;
if (!corpus) throw Error("Reading generation has no golden corpus");
for (const id of selected)
	if (!corpus.cases[id]) throw Error(`Unknown evaluation case ${id}`);

type Variant = { name: string; systemPrompt: string };
const variants: Variant[] = [
	{ name: "current", systemPrompt: assembleSystemPrompt(promptSource) },
];
if (values.baseline) {
	const show = (path: string) => {
		const result = Bun.spawnSync([
			"git",
			"show",
			`${values.baseline}:battery/dumgen/src/concrete-lang/de/reading-emoji-description/generate/${path}`,
		]);
		if (result.exitCode !== 0) throw Error(result.stderr.toString());
		return result.stdout.toString();
	};
	const old = JSON.parse(show("source-data.json")) as {
		body: string;
		demonstrationIds: string[];
	};
	// Demonstration ids at the baseline revision; their texts come from the
	// current corpus, so edits to an existing demonstration are not isolated.
	const oldDemos = [
		...show("cases.ts").matchAll(
			/\{\s*id:\s*"([^"]+)"[^{}]*?demo:\s*true/gu,
		),
	].map((match) => prefix + match[1]);
	variants.push({
		name: `baseline:${values.baseline}`,
		systemPrompt: assembleSystemPrompt({
			...promptSource,
			body: old.body,
			demonstrations: corpus.select([
				...new Set([...old.demonstrationIds, ...oldDemos]),
			]),
		}),
	});
}
const configuration = {
	model: values.model,
	settings: { reasoning: { effort: "none" }, service_tier: "fast" },
};
const directory = resolve(
	values.output ??
		`../../.runs/reading-samples/${new Date().toISOString().replaceAll(":", "-")}`,
);
await mkdir(directory, { recursive: true });
await Bun.write(
	resolve(directory, "manifest.json"),
	JSON.stringify(
		{
			startedAt: new Date().toISOString(),
			configuration,
			samples,
			variants,
			caseIds: selected,
		},
		null,
		2,
	),
);
const execute = createOpenAIExecutor();
type Record_ = {
	variant: string;
	caseId: string;
	sample: number;
	status: "Success" | "InvalidOutput" | "ProviderFailure";
	output?: string;
	contractPass?: boolean | null;
	error?: string;
};
const jobs: (() => Promise<Record_>)[] = [];
for (let sample = 0; sample < samples; sample++)
	for (const [index, caseId] of selected.entries())
		for (let offset = 0; offset < variants.length; offset++) {
			const variant =
				variants[(index + sample + offset) % variants.length];
			const example = corpus.cases[caseId];
			if (!variant || !example) throw Error("Missing variant or case");
			jobs.push(async () => {
				const request: Parameters<EvaluationExecutor>[0] = {
					systemPrompt: variant.systemPrompt,
					outputFormat: "text",
					cachePrompt: true,
					configuration,
					input: example.input,
					signal: AbortSignal.timeout(30_000),
				};
				try {
					const response = await execute(request);
					const parsed = emojiDescriptionSchema.safeParse(
						response.output,
					);
					if (!parsed.success)
						return {
							variant: variant.name,
							caseId,
							sample,
							status: "InvalidOutput",
							output: String(response.output),
						};
					const evaluation = evaluateGeneratedEmoji(
						caseId,
						{ decision: "New", emojiDescription: parsed.data },
						{
							decision: "New",
							emojiDescription: String(example.idealOutput),
						},
					);
					return {
						variant: variant.name,
						caseId,
						sample,
						status: "Success",
						output: parsed.data,
						contractPass: evaluation.contractPass,
					};
				} catch (error) {
					return {
						variant: variant.name,
						caseId,
						sample,
						status: "ProviderFailure",
						error: String(error),
					};
				}
			});
		}
const records: Record_[] = [];
let next = 0;
await Promise.all(
	Array.from({ length: concurrency }, async () => {
		while (next < jobs.length) {
			const job = jobs[next++];
			if (job) records.push(await job());
		}
	}),
);
await Bun.write(
	resolve(directory, "samples.jsonl"),
	`${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
);
const summary = variants.map((variant) => ({
	variant: variant.name,
	cases: selected.map((caseId) => {
		const own = records.filter(
			(record) =>
				record.variant === variant.name && record.caseId === caseId,
		);
		const outputs: Record<string, number> = {};
		for (const record of own) {
			const key = record.output ?? record.status;
			outputs[key] = (outputs[key] ?? 0) + 1;
		}
		return {
			caseId: caseId.slice(prefix.length),
			passed: own.filter((record) => record.contractPass === true).length,
			failed: own.filter(
				(record) =>
					record.contractPass === false ||
					record.status !== "Success",
			).length,
			review: own.filter(
				(record) =>
					record.status === "Success" && record.contractPass === null,
			).length,
			outputs,
		};
	}),
}));
await Bun.write(
	resolve(directory, "summary.json"),
	JSON.stringify(summary, null, 2),
);
for (const variant of summary) {
	const totals = variant.cases.reduce(
		(sum, item) => ({
			passed: sum.passed + item.passed,
			failed: sum.failed + item.failed,
			review: sum.review + item.review,
		}),
		{ passed: 0, failed: 0, review: 0 },
	);
	console.log(
		`\n${variant.variant}  pass=${totals.passed} fail=${totals.failed} review=${totals.review}`,
	);
	for (const item of variant.cases)
		console.log(
			`  ${item.caseId.padEnd(22)} pass=${item.passed} fail=${item.failed} review=${item.review}  ${Object.entries(
				item.outputs,
			)
				.map(([k, v]) => `${k}×${v}`)
				.join(" ")}`,
		);
}
console.log(`\nSaved ${directory}`);
