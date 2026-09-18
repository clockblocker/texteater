import { writeFile } from "node:fs/promises";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import type { Questions, SystemOneResult } from "promptsmith/typesafe";

export const judge = createTypeSafeExecutor({
	apiKey: process.env.TYPESAFE_API_KEY ?? process.env.TYPESAFE_TOKEN,
});

export type Call = {
	route: string;
	durationMs: number;
	questions: number;
	input_tokens: number;
	output_tokens: number;
};

/** One jev round trip, timed. */
export async function ask<const Q extends Questions>(
	calls: Call[],
	route: string,
	state: unknown,
	questions: Q,
): Promise<SystemOneResult<Q>> {
	const start = performance.now();
	const result = await judge(
		{ state: state as never, questions, model: "jev-latest" },
		{ timeout: 30_000, retry: { maxRetries: 0 } },
	);
	calls.push({
		route,
		durationMs: performance.now() - start,
		questions: Object.keys(questions).length,
		input_tokens: result.usage?.input_tokens ?? 0,
		output_tokens: result.usage?.output_tokens ?? 0,
	});
	return result;
}

export function stable(value: unknown): string {
	return JSON.stringify(value, (_, v) =>
		v && typeof v === "object" && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
			: v,
	);
}

export type CaseResult = {
	id: string;
	pass: boolean;
	expected: unknown;
	actual: unknown;
	calls: Call[];
	error?: string;
};

export async function runCases<C>(
	cases: readonly C[],
	concurrency: number,
	run: (c: C) => Promise<CaseResult>,
): Promise<CaseResult[]> {
	const results: CaseResult[] = [];
	let next = 0;
	async function worker() {
		while (next < cases.length) {
			const c = cases[next++]!;
			try {
				results.push(await run(c));
			} catch (error) {
				results.push({
					id: String((c as { id?: string }).id ?? next),
					pass: false,
					expected: null,
					actual: null,
					calls: [],
					error: error instanceof Error ? error.message : String(error),
				});
			}
			if (results.length % 20 === 0)
				console.error(`  ${results.length}/${cases.length}`);
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker));
	return results;
}

export function summarize(name: string, results: CaseResult[]) {
	const passed = results.filter((r) => r.pass).length;
	const errored = results.filter((r) => r.error).length;
	const calls = results.flatMap((r) => r.calls);
	const perCase = results.map((r) =>
		r.calls.reduce((sum, c) => sum + c.durationMs, 0),
	);
	const sorted = [...perCase].sort((a, b) => a - b);
	const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
	const summary = {
		name,
		cases: results.length,
		passed,
		passRate: +(passed / results.length).toFixed(3),
		errored,
		callsPerCase: +(calls.length / results.length).toFixed(2),
		questionsPerCase: +(calls.reduce((s, c) => s + c.questions, 0) / results.length).toFixed(1),
		inputTokensPerCase: Math.round(calls.reduce((s, c) => s + c.input_tokens, 0) / results.length),
		outputTokensPerCase: Math.round(calls.reduce((s, c) => s + c.output_tokens, 0) / results.length),
		sequentialLatencyMs: { p50: Math.round(q(0.5)), p90: Math.round(q(0.9)), mean: Math.round(perCase.reduce((a, b) => a + b, 0) / perCase.length) },
		byRoute: Object.fromEntries(
			[...new Set(calls.map((c) => c.route))].map((route) => {
				const own = calls.filter((c) => c.route === route);
				return [route, { calls: own.length, meanMs: Math.round(own.reduce((s, c) => s + c.durationMs, 0) / own.length) }];
			}),
		),
	};
	console.log(JSON.stringify(summary, null, 2));
	return summary;
}

export async function save(path: string, value: unknown) {
	await writeFile(path, JSON.stringify(value, null, 2));
}
