/**
 * Measures intake end to end at several outer analysis concurrencies (#558):
 * submitText with production Dumgen transports and an in-memory persistence
 * port, so one pass is text in -> every German sentence analysed. Arms run
 * in ABBA order. Live model calls, a few cents per pass.
 *
 *   bun --env-file=../../.env.local tooling/measure-intake-concurrency.ts \
 *     --text T16 --concurrency 4,8,16 --reps 2
 *
 * T16 is the first 16 sentences of Dumgen's sentence-analysis corpus; T25 is
 * the 25-sentence prose of the 2026-09-23 audit (E6).
 */
import { parseArgs } from "node:util";
import type { OperationTrace } from "dumgen/types";
import * as Effect from "effect/Effect";
import corpus from "../../../battery/dumgen/src/concrete-lang/de/sentence-analysis/source-data.json";
import { createTfDemoOrchestrator } from "../server/linguisticOrchestration";
import { createProductionDumgen } from "../server/modelExecution";

const { values: args } = parseArgs({
	options: {
		text: { type: "string", default: "T16" },
		concurrency: { type: "string", default: "4,8,16" },
		reps: { type: "string", default: "2" },
	},
});

const prose = [
	"Am Samstagmorgen stand Lena früher auf als sonst.",
	"Sie wollte mit ihrem Großvater auf den Wochenmarkt gehen, der jeden Samstag vor dem Rathaus stattfindet.",
	"Ihr Großvater wohnte nur zwei Straßen weiter.",
	"Als sie bei ihm ankam, saß er schon am Küchentisch und trank seinen Kaffee.",
	"„Du bist ja pünktlich wie die Maurer“, sagte er und lachte.",
	"Sie zogen ihre Jacken an und machten sich auf den Weg.",
	"Unterwegs erzählte der Großvater von früher, als er selbst noch ein kleiner Junge war.",
	"Auf dem Markt war schon viel los.",
	"Überall standen Leute vor den Ständen und unterhielten sich.",
	"Lena blieb vor einem Stand mit Äpfeln stehen.",
	"Die Verkäuferin gab ihr einen Apfel zum Probieren.",
	"Er schmeckte süß und ein bisschen sauer.",
	"Der Großvater kaufte zwei Kilo davon, obwohl er eigentlich nur Kartoffeln holen wollte.",
	"Danach gingen sie zum Käsestand, wo ein alter Freund des Großvaters arbeitete.",
	"Die beiden Männer hatten sich lange nicht gesehen.",
	"Dort gefielen Lena besonders die gelben Tulpen.",
	"Sie hatte aber nicht genug Geld dabei.",
	"Plötzlich stand der Großvater hinter ihr.",
	"Er hatte alles gesehen und kaufte ihr einen kleinen Strauß.",
	"Lena freute sich riesig darüber.",
	"Auf dem Rückweg fing es an zu regnen.",
	"Weil sie keinen Regenschirm dabeihatten, warteten sie unter dem Dach einer Bushaltestelle.",
	"Trotzdem hörte sie ihm gern zu.",
	"Zu Hause kochten sie zusammen eine Kartoffelsuppe.",
	"Am Abend war Lena müde, aber glücklich.",
];
const texts: Record<string, string> = {
	T16: Object.values(
		corpus.cases as Record<
			string,
			{ input: { segments: { text: string }[] } }
		>,
	)
		.slice(0, 16)
		.map(({ input }) => input.segments.map(({ text }) => text).join(""))
		.join(" "),
	T25: prose.join(" "),
};
const text = texts[args.text];
if (!text) throw Error(`Unknown text ${args.text}`);
const concurrencies = args.concurrency.split(",").map(Number);
const reps = Number(args.reps);

type Pass = {
	concurrency: number;
	rep: number;
	ms: number;
	sentences: number;
	analysed: number;
	calls: number;
	failedCalls: number;
	queuedRequests: number;
	queueWaitMs: number;
};

async function pass(concurrency: number, rep: number): Promise<Pass> {
	const traces: OperationTrace[] = [];
	const dumgen = createProductionDumgen((event) => {
		if (event.kind === "TraceRecorded")
			traces.push(JSON.parse(event.traceJson) as OperationTrace);
	});
	let analysed = 0;
	let sentences = 0;
	const orchestrator = createTfDemoOrchestrator({
		dumgen,
		analysisConcurrency: concurrency,
		dictionary: {
			findStoredReadings: () => {
				throw Error("Intake reads no Readings");
			},
		},
		persistence: {
			async persistSubmittedText(input) {
				sentences = input.sentences.length;
				analysed = input.sentences.filter(
					(sentence) => sentence.analysis,
				).length;
				return { textId: "measure" };
			},
		} as never,
	});
	const start = performance.now();
	await Effect.runPromise(
		orchestrator.submitText({
			submissionKey: `measure-${concurrency}-${rep}`,
			sourceText: text ?? "",
		}),
	);
	const ms = performance.now() - start;
	const calls = traces.flatMap((trace) => trace.calls);
	const queued = traces.flatMap((trace) =>
		trace.events.filter((event) => event.kind === "RequestQueued"),
	);
	return {
		concurrency,
		rep,
		ms: Math.round(ms),
		sentences,
		analysed,
		calls: calls.length,
		failedCalls: calls.filter((call) => call.transport !== "Success")
			.length,
		queuedRequests: queued.length,
		queueWaitMs: Math.round(
			queued.reduce(
				(sum, event) => sum + (event.data as { waitMs: number }).waitMs,
				0,
			),
		),
	};
}

const passes: Pass[] = [];
for (let rep = 0; rep < reps; rep++) {
	const order = rep % 2 ? [...concurrencies].reverse() : concurrencies;
	for (const concurrency of order) {
		const result = await pass(concurrency, rep);
		passes.push(result);
		console.log(JSON.stringify({ text: args.text, ...result }));
	}
}
const median = (values: number[]) => {
	const sorted = values.toSorted((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};
console.log(
	`\n${args.text}: concurrency | median ms | passes ms | failed calls`,
);
for (const concurrency of concurrencies) {
	const arm = passes.filter((item) => item.concurrency === concurrency);
	console.log(
		`${concurrency} | ${median(arm.map((item) => item.ms))} | ${arm.map((item) => item.ms).join(", ")} | ${arm.reduce((sum, item) => sum + item.failedCalls, 0)}`,
	);
}
