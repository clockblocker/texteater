import { Context, Effect } from "effect";
import { ParsingError, parseAsReading } from "dumling";

export type Route = Readonly<{
	language: "de";
	family: "Lexeme";
	kind: "NOUN";
	prompt: "zero-candidate" | "compare-candidates";
}>;
export type Analysis = Readonly<{
	source: string;
	route: Route;
	reading: string;
	emoji: string;
}>;
export type TraceEvent = Readonly<{
	stage: string;
	event: string;
	detail: unknown;
}>;
export type Trace = { events: TraceEvent[]; diagnostics: string[] };
export type ScenarioOutcome = "succeeded" | "failed" | "interrupted";

export type InvalidInput = Readonly<{ _tag: "InvalidInput"; message: string }>;
export type ProviderFailure = Readonly<{
	_tag: "ProviderFailure";
	message: string;
	retryable: boolean;
	attempt: number;
}>;
export type InvalidModelOutput = Readonly<{
	_tag: "InvalidModelOutput";
	raw: string;
	message: string;
}>;
export type RevisionConflict = Readonly<{
	_tag: "RevisionConflict";
	expected: number;
	actual: number;
}>;
export type PipelineFailure =
	| InvalidInput
	| ProviderFailure
	| InvalidModelOutput
	| RevisionConflict;

export type OpenAiRequest = Readonly<{
	model: string;
	messages: readonly Readonly<{ role: "system" | "user"; content: string }>[];
	response_format: Readonly<{ type: "json_object" }>;
}>;
export type OpenAiResponse = Readonly<{
	requestId: string;
	body: Readonly<{ text(signal: AbortSignal): Promise<string> }>;
}>;
export interface TransportShape {
	request(
		request: OpenAiRequest,
		signal: AbortSignal,
	): Promise<OpenAiResponse>;
}
export interface StructuralParser<A> {
	parse(
		input: unknown,
	): A | Readonly<{ _tag: "ParsingError"; message: string }>;
}

export class ModelTransport extends Context.Tag("prototype/ModelTransport")<
	ModelTransport,
	TransportShape
>() {}
export class DictionaryStore extends Context.Tag("prototype/DictionaryStore")<
	DictionaryStore,
	InMemoryDictionary
>() {}
export class TraceRecorder extends Context.Tag("prototype/TraceRecorder")<
	TraceRecorder,
	Recorder
>() {}

export class Recorder {
	readonly trace: Trace = { events: [], diagnostics: [] };
	constructor(private readonly failAt?: number) {}
	record(event: TraceEvent): void {
		if (
			this.failAt !== undefined &&
			this.trace.events.length === this.failAt
		)
			throw new Error("recorder sink unavailable");
		this.trace.events.push(structuredClone(event));
	}
	diagnostic(message: string): void {
		this.trace.diagnostics.push(message);
	}
}

export type DictionarySnapshot = Readonly<{
	revision: number;
	candidates: readonly string[];
}>;
export type DictionaryPlan = Readonly<{
	baseRevision: number;
	changes: readonly Readonly<{
		op: "create-reading";
		reading: string;
		emoji: string;
	}>[];
}>;
export type PreparedMutation = Readonly<{
	plan: DictionaryPlan;
	summary: string;
}>;

export class InMemoryDictionary {
	revision = 1;
	readonly readings: string[] = [];
	conflictOnce = false;
	reads = 0;
	prepares = 0;
	commits = 0;
	snapshot(): DictionarySnapshot {
		this.reads += 1;
		return Object.freeze({
			revision: this.revision,
			candidates: Object.freeze([...this.readings]),
		});
	}
	commit(
		plan: DictionaryPlan,
	): Effect.Effect<Readonly<{ revision: number }>, RevisionConflict> {
		return Effect.sync(() => {
			this.commits += 1;
			if (this.conflictOnce) {
				this.conflictOnce = false;
				this.revision += 1;
			}
			if (plan.baseRevision !== this.revision)
				return Effect.fail({
					_tag: "RevisionConflict" as const,
					expected: plan.baseRevision,
					actual: this.revision,
				});
			const next = [...this.readings];
			for (const change of plan.changes)
				if (!next.includes(change.reading)) next.push(change.reading);
			this.readings.splice(0, this.readings.length, ...next);
			this.revision += 1;
			return Effect.succeed(Object.freeze({ revision: this.revision }));
		}).pipe(Effect.flatten);
	}
}

const event = (
	stage: string,
	name: string,
	detail: unknown,
): Effect.Effect<void, never, TraceRecorder> =>
	Effect.gen(function* () {
		const recorder = yield* TraceRecorder;
		const span = yield* Effect.currentSpan.pipe(Effect.option);
		const correlation =
			span._tag === "Some"
				? { traceId: span.value.traceId, spanId: span.value.spanId }
				: { traceId: "none", spanId: "none" };
		yield* Effect.try({
			try: () =>
				recorder.record({
					stage,
					event: name,
					detail: { correlation, value: detail },
				}),
			catch: (cause) => cause,
		}).pipe(
			Effect.catchAll((cause) =>
				Effect.sync(() =>
					recorder.diagnostic(
						`recording failed at ${stage}/${name}: ${String(cause)}`,
					),
				),
			),
		);
	});

const route = (
	source: string,
): Effect.Effect<Route, InvalidInput, TraceRecorder> =>
	Effect.gen(function* () {
		if (source !== "Haus")
			return yield* Effect.fail({
				_tag: "InvalidInput" as const,
				message: "prototype supports exactly 'Haus'",
			});
		// The route itself stays deterministic; candidate mode is populated in the pipeline after its immutable read.
		yield* event("routing", "selected", {
			source,
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
		});
		return {
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			prompt: "zero-candidate",
		};
	});

export const readingParser: StructuralParser<
	Readonly<{ reading: string; emoji: string }>
> = {
	parse(input) {
		if (typeof input !== "object" || input === null)
			return { _tag: "ParsingError", message: "expected object" };
		const value = input as Record<string, unknown>;
		if (
			typeof value.reading !== "string" ||
			typeof value.emoji !== "string"
		)
			return {
				_tag: "ParsingError",
				message: "expected string reading and emoji",
			};
		const parsed = parseAsReading(
			{
				lemma: {
					canonicalForm: value.reading,
					coreFeatures: { gender: "Neut", hyph: null },
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
				},
				emojiDescription: value.emoji,
			},
			"de",
			"Lexeme",
			"NOUN",
		);
		return parsed instanceof ParsingError
			? { _tag: "ParsingError", message: parsed.message }
			: Object.freeze({
					reading: parsed.lemma.canonicalForm,
					emoji: parsed.emojiDescription,
				});
	},
};

// Provider failure is handled here because generation must record and retry the smallest operation.
const generateWithRetry = (
	source: string,
	selected: Route,
): Effect.Effect<
	Analysis,
	ProviderFailure | InvalidModelOutput,
	ModelTransport | TraceRecorder
> => {
	const attempt = (
		number: number,
	): Effect.Effect<
		Analysis,
		ProviderFailure | InvalidModelOutput,
		ModelTransport | TraceRecorder
	> =>
		Effect.gen(function* () {
			const transport = yield* ModelTransport;
			const request: OpenAiRequest = {
				model: "fake-gpt",
				messages: [
					{ role: "system", content: selected.prompt },
					{ role: "user", content: source },
				],
				response_format: { type: "json_object" },
			};
			yield* event("generation", "attempt-started", {
				attempt: number,
				request,
			});
			const response = yield* Effect.either(
				Effect.tryPromise({
					try: (signal) =>
						transport
							.request(request, signal)
							.then((response) => response.body.text(signal)),
					catch: (cause) => ({
						_tag: "ProviderFailure" as const,
						message: String(cause),
						retryable: true,
						attempt: number,
					}),
				}),
			);
			if (response._tag === "Left") {
				if (response.left.retryable && number < 3) {
					yield* event("generation", "retry-scheduled", {
						attempt: number,
						delayMs: 0,
						failure: response.left,
					});
					return yield* attempt(number + 1);
				}
				return yield* Effect.fail(response.left);
			}
			const raw = response.right;
			yield* event("validation", "raw-received", { raw });
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return yield* Effect.fail({
					_tag: "InvalidModelOutput" as const,
					raw,
					message: "invalid JSON",
				});
			}
			const checked = readingParser.parse(parsed);
			if ("_tag" in checked)
				return yield* Effect.fail({
					_tag: "InvalidModelOutput" as const,
					raw,
					message: checked.message,
				});
			const analysis = Object.freeze({
				source,
				route: selected,
				...checked,
			});
			yield* event("projection", "accepted", { analysis });
			return analysis;
		});
	return attempt(1);
};

const prepare = (
	analysis: Analysis,
	snapshot: DictionarySnapshot,
): Effect.Effect<PreparedMutation, never, DictionaryStore | TraceRecorder> =>
	Effect.gen(function* () {
		const store = yield* DictionaryStore;
		store.prepares += 1;
		const changes: readonly Readonly<{
			op: "create-reading";
			reading: string;
			emoji: string;
		}>[] = snapshot.candidates.includes(analysis.reading)
			? []
			: [
					{
						op: "create-reading",
						reading: analysis.reading,
						emoji: analysis.emoji,
					},
				];
		const plan: DictionaryPlan = Object.freeze({
			baseRevision: snapshot.revision,
			changes: Object.freeze(
				changes.map((change) => Object.freeze(change)),
			),
		});
		yield* event("dictionary.prepare", "prepared", { plan });
		return Object.freeze({
			plan,
			summary:
				changes.length === 0 ? "already-satisfied" : "create-reading",
		});
	});

const prepareAndCommit = (
	analysis: Analysis,
	remainingConflictRetries: number,
): Effect.Effect<
	Readonly<{ revision: number }>,
	RevisionConflict,
	DictionaryStore | TraceRecorder
> =>
	Effect.gen(function* () {
		const store = yield* DictionaryStore;
		const snapshot = store.snapshot();
		yield* event("dictionary.read", "snapshot", snapshot);
		const prepared = yield* prepare(analysis, snapshot);
		const committed = yield* store.commit(prepared.plan).pipe(
			Effect.tap((result) =>
				event("dictionary.commit", "committed", result),
			),
			Effect.either,
		);
		if (committed._tag === "Right") return committed.right;
		yield* event("dictionary.commit", "conflict", committed.left);
		if (remainingConflictRetries === 0)
			return yield* Effect.fail(committed.left);
		yield* event("dictionary.commit", "reprepare", {
			reason: "revision-conflict",
			remainingConflictRetries,
		});
		return yield* prepareAndCommit(analysis, remainingConflictRetries - 1);
	});

export const pipeline = (
	source: string,
): Effect.Effect<
	Readonly<{ analysis: Analysis; committedRevision: number }>,
	PipelineFailure,
	ModelTransport | DictionaryStore | TraceRecorder
> =>
	Effect.gen(function* () {
		yield* event("pipeline", "started", { source });
		const initial = yield* route(source);
		const store = yield* DictionaryStore;
		const candidates = store.snapshot();
		const selected: Route = Object.freeze({
			...initial,
			prompt:
				candidates.candidates.length === 0
					? "zero-candidate"
					: "compare-candidates",
		});
		yield* event("dictionary.read", "candidates", candidates);
		yield* event("routing", "prompt-selected", {
			prompt: selected.prompt,
			candidateCount: candidates.candidates.length,
		});
		const analysis = yield* generateWithRetry(source, selected);
		const committed = yield* prepareAndCommit(analysis, 1);
		yield* event("pipeline", "succeeded", {
			committedRevision: committed.revision,
		});
		return Object.freeze({
			analysis,
			committedRevision: committed.revision,
		});
	}).pipe(Effect.withSpan("dum.pipeline"));

export const typeWitnesses = {
	providerRequirement: generateWithRetry("Haus", {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		prompt: "zero-candidate",
	}),
	pipelineRequirement: pipeline("Haus"),
};
