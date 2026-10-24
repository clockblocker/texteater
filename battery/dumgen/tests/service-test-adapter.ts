/** Offline test adapters over the production service Layers. */
import * as Effect from "effect/Effect";
import { runOperation as operation } from "../src/call.js";
import { DumgenLive } from "../src/dumgen-live.js";
import { JevTransport } from "../src/jev-call.js";
import type { LanguageModules } from "../src/language-module.js";
import { Languages } from "../src/languages.js";
import type { LunaAsk, LunaConfiguration } from "../src/luna.js";
import { LunaTransport } from "../src/luna-call.js";
import type { OperationTrace } from "../src/operation-trace.js";
import { operations } from "../src/operations.js";
import type { JevAsk } from "../src/segment/jev.js";
import { type FakeDumgenOptions, liveOver } from "./live-over.js";
export type Dumgen = typeof operations;
export const requestBudget = (n: number) => n;
type Models = {
	jev: { ask: JevAsk; model: string };
	luna: { ask: LunaAsk; configuration: LunaConfiguration };
};
export function runOperation<A, E, R>(
	name: Parameters<typeof operation>[0],
	options: {
		budget: number;
		payloads: boolean;
		onOperation?: (trace: OperationTrace) => void;
	},
	models: Models,
	body: Effect.Effect<A, E, R>,
	modules?: LanguageModules,
) {
	const program = operation(name, body);
	return (
		modules
			? program.pipe(Effect.provideService(Languages, modules))
			: program
	).pipe(
		Effect.provide(
			DumgenLive({
				jev: JevTransport.fromAsk(models.jev.ask),
				luna: LunaTransport.fromAsk(models.luna.ask),
				jevModel: models.jev.model,
				lunaConfiguration: models.luna.configuration,
				requestBudget: options.budget,
				tracePayloads: options.payloads,
				...(options.onOperation
					? { onOperation: options.onOperation }
					: {}),
			}),
		),
	);
}
/** A test-only convenience: every call supplies a fresh production Layer. */
export function fakeDumgen(options: FakeDumgenOptions) {
	const layer = liveOver(options);
	const bind =
		<A extends readonly unknown[], B, E, R>(
			fn: (...args: A) => Effect.Effect<B, E, R>,
		) =>
		(...args: A) =>
			fn(...args).pipe(Effect.provide(layer));
	return {
		segment: {
			inUnits: <
				L extends
					import("../src/segment/segmented-sentence.js").SegmentLanguage,
			>(
				input: import("../src/segment/in-units.js").InUnitsInput<L>,
			) => operations.segment.inUnits(input).pipe(Effect.provide(layer)),
		},
		resolve: {
			grammar: bind(operations.resolve.grammar),
			reading: bind(operations.resolve.reading),
		},
		knowledge: {
			produce: bind(operations.knowledge.produce),
			accumulateTranslations: bind(
				operations.knowledge.accumulateTranslations,
			),
		},
	};
}
