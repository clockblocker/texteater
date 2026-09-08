type Scenario =
	| "baseline"
	| "effect-barrel"
	| "effect-narrow"
	| "prototype-import"
	| "prototype-operation"
	| "minimal-bundled-import"
	| "minimal-bundled-operation";

const scenario = Bun.argv[2] as Scenario | undefined;
if (scenario === undefined) throw new Error("Missing measurement scenario.");
const effectRoot = new URL(
	"../../battery/dumgen/prototype-effect/node_modules/effect/dist/esm/",
	import.meta.url,
);

if (scenario === "baseline") await import("./empty-module.ts");
if (scenario === "effect-barrel")
	await import(new URL("index.js", effectRoot).href);
if (scenario === "effect-narrow")
	await import(new URL("Effect.js", effectRoot).href);
if (scenario === "prototype-import")
	await import("../../battery/dumgen/prototype-effect/src/pipeline.ts");
if (scenario === "minimal-bundled-import")
	await import("./artifacts/minimal-effect-bundled.mjs");

if (scenario === "prototype-operation") {
	const [{ Effect }, prototype] = await Promise.all([
		import(new URL("index.js", effectRoot).href),
		import("../../battery/dumgen/prototype-effect/src/pipeline.ts"),
	]);
	const {
		DictionaryStore,
		InMemoryDictionary,
		ModelTransport,
		pipeline,
		Recorder,
		TraceRecorder,
	} = prototype;
	const transport = {
		request: async (_request: unknown, signal: AbortSignal) => {
			if (signal.aborted) throw signal.reason;
			return {
				requestId: "measurement-request",
				body: {
					text: async (bodySignal: AbortSignal) => {
						if (bodySignal.aborted) throw bodySignal.reason;
						return JSON.stringify({ reading: "Haus", emoji: "🏠" });
					},
				},
			};
		},
	};
	const program = pipeline("Haus").pipe(
		Effect.provideService(ModelTransport, transport),
		Effect.provideService(DictionaryStore, new InMemoryDictionary()),
		Effect.provideService(TraceRecorder, new Recorder()),
	);
	await Effect.runPromise(program);
}

if (scenario === "minimal-bundled-operation") {
	const { execute } = await import("./artifacts/minimal-effect-bundled.mjs");
	await execute();
}

process.stdout.write(`${process.resourceUsage().maxRSS}\n`);
