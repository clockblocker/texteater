import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { assembleSystemPrompt, stableJson } from "promptsmith";
import type { EvaluationExecutor } from "promptsmith/evaluation";
import { summarizeQuality } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import {
	additionalDemonstrationIds,
	evaluateGeneratedEmoji,
} from "../src/concrete-lang/de/reading-emoji-description/generate/cases.js";
import { evaluationCaseIds } from "../src/concrete-lang/de/reading-emoji-description/generate/evaluation-ids.js";
import { promptSource } from "../src/concrete-lang/de/reading-emoji-description/generate/prompt.js";
import { emojiDescriptionSchema } from "../src/generated/schemas.js";

// Paid, opt-in experiment. Rotating variant order reduces temporal bias; the
// saved artifact includes exact prompts, requests, responses and cache usage.
const { values } = parseArgs({
	options: {
		baseline: { type: "string" },
		output: { type: "string" },
		limit: { type: "string" },
		model: { type: "string", default: "gpt-5.6-luna" },
	},
});
if (!values.baseline || !values.output)
	throw Error(
		"Usage: bun --env-file=.env.local battery/dumgen/cli/benchmark-reading.ts --baseline GIT_REF --output NEW_DIRECTORY [--limit N] [--model MODEL]",
	);
const limit =
	values.limit === undefined
		? evaluationCaseIds.length
		: Number(values.limit);
if (!Number.isSafeInteger(limit) || limit < 1)
	throw Error("--limit must be a positive integer");
const selected = evaluationCaseIds.slice(0, limit);
const revision = Bun.spawnSync([
	"git",
	"rev-parse",
	"--verify",
	"--end-of-options",
	`${values.baseline}^{commit}`,
]);
if (revision.exitCode !== 0) throw Error("--baseline must resolve to a commit");
const baselineRevision = revision.stdout.toString().trim();
const baseline = Bun.spawnSync([
	"git",
	"show",
	`${baselineRevision}:battery/dumgen/src/concrete-lang/de/reading-emoji-description/generate/source-data.json`,
]);
if (baseline.exitCode !== 0) throw Error(baseline.stderr.toString());
const old = JSON.parse(baseline.stdout.toString()) as {
	body: string;
	demonstrationIds: string[];
	cases: Record<string, { input: unknown; idealOutput: string }>;
};
const oldPrompt = `${old.body.trim()}\n\nExamples to follow:\n\n${old.demonstrationIds
	.map((id, index) => {
		const example = old.cases[id];
		if (!example) throw Error(`Missing baseline demonstration ${id}`);
		return `Example ${index + 1}\nInput:\n${stableJson(example.input)}\nIdeal output:\n${stableJson(example.idealOutput)}`;
	})
	.join("\n\n")}`;
const variants = [
	{
		name: "original-schema",
		systemPrompt: oldPrompt,
		outputSchema: { type: "string", minLength: 1 },
	},
	{
		name: "original-text",
		systemPrompt: oldPrompt,
		outputFormat: "text" as const,
	},
	{
		name: "compact-text",
		systemPrompt: assembleSystemPrompt({
			...promptSource,
			demonstrations: promptSource.goldenCorpus?.select(
				old.demonstrationIds,
			),
		}),
		outputFormat: "text" as const,
	},
	{
		name: "examples-cached-text",
		systemPrompt: assembleSystemPrompt({
			...promptSource,
			demonstrations: promptSource.goldenCorpus?.select([
				...new Set([
					...(promptSource.demonstrations &&
					"ids" in promptSource.demonstrations
						? promptSource.demonstrations.ids
						: old.demonstrationIds),
					...additionalDemonstrationIds,
				]),
			]),
		}),
		outputFormat: "text" as const,
		cachePrompt: true,
	},
];
const directory = resolve(values.output);
await mkdir(directory, { recursive: false });
const configuration = {
	model: values.model,
	settings: { reasoning: { effort: "none" } },
};
await Bun.write(
	resolve(directory, "manifest.json"),
	JSON.stringify(
		{
			baseline: baselineRevision,
			startedAt: new Date().toISOString(),
			configuration,
			variants,
			caseIds: selected,
			cases: Object.fromEntries(
				selected.map((id) => [
					id,
					promptSource.goldenCorpus?.cases[id],
				]),
			),
		},
		null,
		2,
	),
);
const execute = createOpenAIExecutor();
const records: {
	variant: string;
	caseId: string;
	status: string;
	durationMs: number;
	evaluation?: ReturnType<typeof evaluateGeneratedEmoji>;
	output?: unknown;
	metadata?: unknown;
	error?: string;
}[] = [];
for (const [index, caseId] of selected.entries()) {
	const example = promptSource.goldenCorpus?.cases[caseId];
	if (!example) throw Error(`Missing evaluation case ${caseId}`);
	for (let offset = 0; offset < variants.length; offset++) {
		const variant = variants[(index + offset) % variants.length];
		if (!variant) throw Error("Missing variant");
		const { name, ...contract } = variant;
		const request: Parameters<EvaluationExecutor>[0] = {
			...contract,
			configuration,
			input: example.input,
			signal: AbortSignal.timeout(30_000),
		};
		const started = performance.now();
		try {
			const response = await execute(request);
			const parsed = emojiDescriptionSchema.safeParse(response.output);
			const evaluation = parsed.success
				? evaluateGeneratedEmoji(
						caseId,
						{ decision: "New", emojiDescription: parsed.data },
						{
							decision: "New",
							emojiDescription: String(example.idealOutput),
						},
					)
				: undefined;
			records.push({
				variant: name,
				caseId,
				...response,
				status: parsed.success ? "Success" : "InvalidOutput",
				durationMs: performance.now() - started,
				evaluation,
			});
		} catch (error) {
			records.push({
				variant: name,
				caseId,
				status: "ProviderFailure",
				durationMs: performance.now() - started,
				error: String(error),
			});
		}
		await Bun.write(
			resolve(directory, "cases.jsonl"),
			`${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
		);
		console.log(JSON.stringify(records.at(-1)));
	}
}
const summary = variants.map(({ name }) => {
	const cases = records.filter((record) => record.variant === name);
	const times = cases
		.filter((record) => record.status === "Success")
		.map((record) => record.durationMs)
		.sort((a, b) => a - b);
	return {
		variant: name,
		total: cases.length,
		quality: summarizeQuality(cases),
		medianMs: times.length
			? ((times[Math.floor((times.length - 1) / 2)] ?? 0) +
					(times[Math.floor(times.length / 2)] ?? 0)) /
				2
			: null,
		p95Ms: times[Math.ceil(times.length * 0.95) - 1] ?? null,
	};
});
await Bun.write(
	resolve(directory, "summary.json"),
	JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
