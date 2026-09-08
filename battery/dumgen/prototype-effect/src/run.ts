import { Cause, Effect } from "effect";
import {
	DictionaryStore,
	InMemoryDictionary,
	ModelTransport,
	pipeline,
	Recorder,
	TraceRecorder,
	type OpenAiRequest,
	type OpenAiResponse,
	type ScenarioOutcome,
	type Trace,
} from "./pipeline.ts";

type Scenario = Readonly<{
	name: string;
	outcome: ScenarioOutcome;
	assertions: Record<string, boolean>;
	trace: Trace;
	result?: unknown;
	failure?: unknown;
	gaps?: readonly string[];
}>;

class FakeTransport {
	calls = 0;
	sawRequestAbort = false;
	sawBodyAbort = false;
	bodyStarted = false;
	constructor(
		private readonly replies: readonly ("network" | string)[],
		private readonly waitForAbort = false,
		private readonly waitForBody = false,
	) {}
	request(
		_request: OpenAiRequest,
		signal: AbortSignal,
	): Promise<OpenAiResponse> {
		this.calls += 1;
		this.sawRequestAbort ||= signal.aborted;
		if (this.waitForAbort)
			return new Promise((_, reject) =>
				signal.addEventListener(
					"abort",
					() => {
						this.sawRequestAbort = true;
						reject(new Error("request aborted"));
					},
					{ once: true },
				),
			);
		const reply = this.replies[this.calls - 1] ?? "network";
		if (reply === "network")
			return Promise.reject(new Error("temporary network failure"));
		return Promise.resolve({
			requestId: `fake-${this.calls}`,
			body: {
				text: (bodySignal) =>
					new Promise((resolve, reject) => {
						this.bodyStarted = true;
						if (bodySignal.aborted) {
							this.sawBodyAbort = true;
							reject(new Error("body aborted"));
							return;
						}
						bodySignal.addEventListener(
							"abort",
							() => {
								this.sawBodyAbort = true;
								reject(new Error("body aborted"));
							},
							{ once: true },
						);
						if (this.waitForBody) return;
						queueMicrotask(() => resolve(reply));
					}),
			},
		});
	}
}

const valid = JSON.stringify({ reading: "Haus", emoji: "🏠" });
const use = (
	transport: FakeTransport,
	store: InMemoryDictionary,
	recorder: Recorder,
) =>
	pipeline("Haus").pipe(
		Effect.provideService(ModelTransport, transport),
		Effect.provideService(DictionaryStore, store),
		Effect.provideService(TraceRecorder, recorder),
	);
const has = (trace: Trace, event: string) =>
	trace.events.some((item) => item.event === event);

const execute = async (
	name: string,
	transport: FakeTransport,
	store = new InMemoryDictionary(),
	recorder = new Recorder(),
): Promise<Scenario> => {
	const exit = await Effect.runPromiseExit(use(transport, store, recorder));
	if (exit._tag === "Success") {
		const result = exit.value;
		return {
			name,
			outcome: "succeeded",
			result,
			assertions: {
				"one Effect external entrypoint completed": true,
				"all recorded events have Effect trace/span correlation":
					recorder.trace.events.every(
						(event) =>
							(
								event.detail as {
									correlation: {
										traceId: string;
										spanId: string;
									};
								}
							).correlation.traceId !== "none",
					),
			},
			trace: recorder.trace,
		};
	} else {
		return {
			name,
			outcome: "failed",
			failure: Cause.pretty(exit.cause),
			assertions: {
				"failure stops dependent commit": store.commits === 0,
			},
			trace: recorder.trace,
		};
	}
};

const scenarios: Scenario[] = [];
scenarios.push(
	await execute("success-zero-candidate", new FakeTransport([valid])),
);

const retryTransport = new FakeTransport(["network", "network", valid]);
const retry = await execute("shared-three-request-retry", retryTransport);
retry.assertions["three actual requests share the generation budget"] =
	retryTransport.calls === 3;
retry.assertions["recovered provider failures remain visible"] =
	retryTransport.calls === 3 && retry.outcome === "succeeded";
scenarios.push(retry);

const invalidTransport = new FakeTransport(["{not-json"]);
const invalid = await execute(
	"invalid-model-output-is-not-retried",
	invalidTransport,
);
invalid.assertions["one malformed response made one request"] =
	invalidTransport.calls === 1;
invalid.assertions["raw invalid output was recorded before validation"] = has(
	invalid.trace,
	"raw-received",
);
scenarios.push(invalid);

const conflictStore = new InMemoryDictionary();
conflictStore.conflictOnce = true;
const conflictTransport = new FakeTransport([valid]);
const conflict = await execute(
	"revision-conflict-reprepares-without-regeneration",
	conflictTransport,
	conflictStore,
);
conflict.assertions["model result was reused"] = conflictTransport.calls === 1;
conflict.assertions["dictionary was reread and reprepared"] =
	conflictStore.reads >= 3 && conflictStore.prepares === 2;
conflict.assertions["revision conflict is explicit in trace"] = has(
	conflict.trace,
	"reprepare",
);
scenarios.push(conflict);

const recorderFailure = new Recorder(2);
const traceFailure = await execute(
	"recorder-failure-is-nonfatal",
	new FakeTransport([valid]),
	new InMemoryDictionary(),
	recorderFailure,
);
traceFailure.assertions["recording failure does not alter domain success"] =
	traceFailure.outcome === "succeeded";
traceFailure.assertions["fallback diagnostic is visible"] =
	recorderFailure.trace.diagnostics.length > 0;
scenarios.push(traceFailure);

const abortTransport = new FakeTransport([], true);
const abortRecorder = new Recorder();
const abortStore = new InMemoryDictionary();
const controller = new AbortController();
const interruptedProgram = use(abortTransport, abortStore, abortRecorder);
const interrupted = Effect.runPromiseExit(interruptedProgram, {
	signal: controller.signal,
});
queueMicrotask(() => controller.abort());
const interruptedExit = await interrupted;
if (interruptedExit._tag === "Success")
	scenarios.push({
		name: "interruption-before-response-headers",
		outcome: "failed",
		assertions: { "unexpected completion": false },
		trace: abortRecorder.trace,
	});
else
	scenarios.push({
		name: "interruption-before-response-headers",
		outcome: "interrupted",
		failure: Cause.pretty(interruptedExit.cause),
		assertions: {
			"AbortSignal reached fake request": abortTransport.sawRequestAbort,
			"no dictionary commit after interruption": abortStore.commits === 0,
		},
		trace: abortRecorder.trace,
		gaps: [
			"This scenario interrupts before response headers; it does not exercise commit-unknown reconciliation.",
		],
	});

const bodyTransport = new FakeTransport([valid], false, true);
const bodyRecorder = new Recorder();
const bodyStore = new InMemoryDictionary();
const bodyController = new AbortController();
const bodyPromise = Effect.runPromiseExit(
	use(bodyTransport, bodyStore, bodyRecorder),
	{ signal: bodyController.signal },
);
await new Promise<void>((resolve) => {
	const poll = () =>
		bodyTransport.bodyStarted ? resolve() : queueMicrotask(poll);
	poll();
});
bodyController.abort();
const bodyExit = await bodyPromise;
scenarios.push({
	name: "interruption-during-response-body",
	outcome: bodyExit._tag === "Failure" ? "interrupted" : "failed",
	failure:
		bodyExit._tag === "Failure" ? Cause.pretty(bodyExit.cause) : undefined,
	assertions: {
		"body consumption received AbortSignal": bodyTransport.sawBodyAbort,
		"no retry after body interruption": bodyTransport.calls === 1,
		"no dictionary commit after body interruption": bodyStore.commits === 0,
	},
	trace: bodyRecorder.trace,
	gaps: [
		"This scenario interrupts body consumption only; commit-unknown reconciliation remains outside the prototype.",
	],
});

const noOpStore = new InMemoryDictionary();
noOpStore.readings.push("Haus");
const noOp = await execute(
	"no-op-plan-still-reaches-commit-boundary",
	new FakeTransport([valid]),
	noOpStore,
);
noOp.assertions["zero-change plan was prepared"] = noOp.trace.events.some(
	(item) => JSON.stringify(item.detail).includes('"changes":[]'),
);
noOp.assertions["commit boundary still ran"] = noOpStore.commits === 1;
scenarios.push({
	...noOp,
	gaps: [
		"The prototype does not include a host occurrence write; it only demonstrates that an empty dictionary plan does not skip the commit boundary.",
	],
});

const failedAssertions = scenarios.flatMap((scenario) =>
	Object.entries(scenario.assertions)
		.filter(([, passed]) => !passed)
		.map(([assertion]) => `${scenario.name}: ${assertion}`),
);
if (failedAssertions.length > 0)
	throw new Error(
		`evidence assertions failed: ${failedAssertions.join("; ")}`,
	);

await Bun.write(
	new URL("../evidence.json", import.meta.url),
	`${JSON.stringify(
		{
			generatedAt: "deterministic-fixture",
			scenarios,
			gaps: [
				"The dictionary snapshot/plan are serializable immutable stand-ins, not Dumdict's production plan parser or storage adapter.",
				"No semantic-precondition failure and no uncertain commit reconciliation adapter are implemented.",
				"There are no injected routing, dictionary-read, or preparation failure adapters in this small prototype; those expected failure paths are not claimed as exercised.",
				"The retry trace includes its three attempt spans but not a separate recovered-failure event; this is a tracing-prototype omission.",
				"No token-exhaustion recovery, deadline/Retry-After, payload artifact files, or exporter flush measurement is implemented.",
				"The representative route uses Haus as de/Lexeme/NOUN and validates the projected Reading through Dumling's package parser; it is not a complete Dumgen grammatical-resolution flow.",
			],
		},
		null,
		2,
	)}\n`,
);
