/**
 * The valency bench (`bun run valency-notation <command>` in
 * battery/dumgen; the OpenAI key from the repository's .env.local): the
 * production valency call over the Knowledge gold, under production's
 * prompt or a revision of it (`revisions.ts`).
 *
 *   tokens                         o200k counts: each revision's prompt, gold frames in the notation
 *   estimate  --revisions a,b --reps N [--set dev] [--latency N]
 *   batch     --revisions a,b --reps N [--set dev] [--budget 0.1]
 *   latency   --revisions a,b --samples 20 [--budget 0.1]
 *   score     <run files…> [--set dev] [--baseline production] [--misses revision]
 *
 * `--set` is dev, heldout or all. Results go to evidence/valency-notation/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { countTokens } from "gpt-tokenizer/encoding/o200k_base";
import { printGermanFrame } from "../../../src/knowledge/de/valency-notation.js";
import { lunaResponsesBody } from "../../../src/openai-luna.js";
import { lunaUsd } from "../resolve-grammar/pricing.js";
import { type ValencyCase, valencyCases } from "./gold.js";
import { requestOf } from "./harness.js";
import { type BenchCase, type Job, runBatch, runLatency } from "./live.js";
import { revisionPrompt, revisions } from "./revisions.js";
import { readRuns, scoreCalls, summarize, table } from "./score.js";

const evidence = fileURLToPath(
	new URL("../../../evidence/valency-notation/", import.meta.url),
);
mkdirSync(evidence, { recursive: true });

const { positionals, values } = parseArgs({
	args: process.argv.slice(2),
	allowPositionals: true,
	options: {
		revisions: { type: "string", default: "production" },
		reps: { type: "string", default: "1" },
		samples: { type: "string", default: "20" },
		latency: { type: "string", default: "0" },
		set: { type: "string", default: "dev" },
		budget: { type: "string", default: "0.1" },
		limit: { type: "string" },
		misses: { type: "string" },
		baseline: { type: "string", default: "production" },
	},
});
const [command, ...files] = positionals;

type Entry = ValencyCase & { readonly bench: BenchCase };

async function benchCases(set: string): Promise<Entry[]> {
	const cases = await valencyCases(
		set === "all" ? ["dev", "heldout"] : [set as "dev" | "heldout"],
	);
	const limited = values.limit ? cases.slice(0, Number(values.limit)) : cases;
	return limited.map((entry) => ({
		...entry,
		bench: { id: entry.goldCase.id, request: requestOf(entry.goldCase) },
	}));
}

const asked = (values.revisions ?? "")
	.split(",")
	.filter(Boolean)
	.map((revision) => ({ revision, systemPrompt: revisionPrompt(revision) }));

const stats = (values: readonly number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
	const p90 = sorted[Math.ceil(0.9 * sorted.length) - 1] ?? 0;
	return { mean: Math.round(mean * 10) / 10, p90, max: sorted.at(-1) ?? 0 };
};

/** Each revision's prompt and every gold frame in the notation, in o200k tokens. */
async function tokens() {
	const cases = await benchCases("all");
	const authored = cases.filter(({ coverage }) => coverage === "Authored");
	const written = ({ frame, context }: Entry) =>
		JSON.stringify({ value: printGermanFrame(frame, context) });
	const report = {
		cases: cases.length,
		authored: authored.length,
		answerTokens: {
			authored: stats(
				authored.map((entry) => countTokens(written(entry))),
			),
			all: stats(cases.map((entry) => countTokens(written(entry)))),
		},
		promptTokens: Object.fromEntries(
			Object.entries(revisions).map(([name, prompt]) => [
				name,
				countTokens(prompt),
			]),
		),
	};
	writeFileSync(
		join(evidence, "prompt-tokens.json"),
		`${JSON.stringify(report, null, "\t")}\n`,
	);
	console.log(JSON.stringify(report, null, 2));
}

/** A round's worst-case price: no cache hit, every gold answer padded by a third. */
function estimate(entries: readonly Entry[], reps: number, latency: number) {
	const perRevision = asked.map(({ revision, systemPrompt }) => {
		const sum = entries
			.map((entry) => {
				const body = lunaResponsesBody({
					...entry.bench.request,
					systemPrompt,
				});
				return {
					inputTokens:
						countTokens(JSON.stringify(body.input)) +
						countTokens(JSON.stringify(body.text)),
					outputTokens: Math.round(
						1.3 *
							(countTokens(
								printGermanFrame(entry.frame, entry.context),
							) +
								10),
					),
				};
			})
			.reduce(
				(total, next) => ({
					inputTokens: total.inputTokens + next.inputTokens,
					outputTokens: total.outputTokens + next.outputTokens,
				}),
				{ inputTokens: 0, outputTokens: 0 },
			);
		return {
			revision,
			batchUsd: lunaUsd(sum, "batch") * reps,
			latencyUsd: (lunaUsd(sum, "fast") / entries.length) * (latency + 1),
		};
	});
	const total = perRevision.reduce(
		(sum, { batchUsd, latencyUsd }) => sum + batchUsd + latencyUsd,
		0,
	);
	return { cases: entries.length, perRevision, worstCaseUsd: total };
}

const apiKey = () => {
	const key = process.env.OPENAI_API_KEY ?? "";
	if (!key) throw Error("OPENAI_API_KEY is not set");
	return key;
};

if (command === "tokens") await tokens();
else if (command === "estimate") {
	const entries = await benchCases(values.set ?? "dev");
	console.log(
		JSON.stringify(
			estimate(entries, Number(values.reps), Number(values.latency)),
			null,
			2,
		),
	);
} else if (command === "batch") {
	const entries = await benchCases(values.set ?? "dev");
	const reps = Number(values.reps);
	const priced = estimate(entries, reps, 0);
	console.log(JSON.stringify(priced));
	if (priced.worstCaseUsd > Number(values.budget))
		throw Error(
			`Projected $${priced.worstCaseUsd.toFixed(4)} is past the budget`,
		);
	const jobs: Job[] = asked.flatMap((revision) =>
		entries.flatMap((entry) =>
			Array.from({ length: reps }, (_, repetition) => ({
				...revision,
				benchCase: entry.bench,
				repetition,
			})),
		),
	);
	console.log(await runBatch(jobs, { apiKey: apiKey(), evidence }));
} else if (command === "latency") {
	const entries = await benchCases(values.set ?? "dev");
	const samples = Number(values.samples);
	const step = Math.max(1, Math.floor(entries.length / samples));
	const sample = entries
		.filter((_, index) => index % step === 0)
		.slice(0, samples);
	const priced = estimate(sample, 0, sample.length);
	console.log(JSON.stringify(priced));
	if (priced.worstCaseUsd * 1.5 > Number(values.budget))
		throw Error(
			`Projected $${priced.worstCaseUsd.toFixed(4)} is past the budget`,
		);
	console.log(
		await runLatency(
			asked,
			sample.map(({ bench }) => bench),
			{ apiKey: apiKey(), evidence },
		),
	);
} else if (command === "score") {
	const entries = await benchCases(values.set ?? "dev");
	const byId = new Map(entries.map((entry) => [entry.goldCase.id, entry]));
	const paths = files.map((file) =>
		file.includes("/") ? file : join(evidence, "runs", file),
	);
	const records = readRuns(paths).filter((record) => byId.has(record.caseId));
	const scored = scoreCalls(records, byId);
	const rows = summarize(scored, values.baseline);
	const name = paths
		.map((path) => basename(path, ".jsonl"))
		.join("+")
		.slice(0, 150);
	const spent = records.reduce((sum, record) => sum + record.usd, 0);
	writeFileSync(
		join(evidence, `score-${values.set}-${name}.json`),
		`${JSON.stringify({ files: paths.map((path) => basename(path)), set: values.set, spentUsd: spent, rows }, null, "\t")}\n`,
	);
	console.log(table(rows));
	console.log(`spent in these runs: $${spent.toFixed(5)}`);
	if (values.misses)
		for (const { record, correct, failed } of scored) {
			if (record.revision !== values.misses || correct) continue;
			const entry = byId.get(record.caseId);
			if (!entry) continue;
			const { reading } = entry.goldCase;
			console.log(
				[
					`${reading.lemma.canonicalForm} ${"emojiDescription" in reading ? reading.emojiDescription : ""}`,
					`gold: ${printGermanFrame(entry.frame, entry.context)}`,
					`said: ${JSON.stringify(record.output ?? record.failure ?? null).slice(0, 300)}`,
					...(failed ? [`failed: ${failed.slice(0, 200)}`] : []),
				].join("\n  "),
			);
		}
} else throw Error(`Unknown command ${command ?? ""}`);
