import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { makeFunctionReference, type TransactionLimits } from "convex/server";
import { convexTest, type TestConvex } from "convex-test";
import { internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";

/**
 * The single Convex database stand-in for tf-demo tests. It runs the real
 * registered functions by reference against `convex/schema.ts`, so argument
 * and return validators, document validation, and index names are exercised.
 * The model and the segmenter stay injected as mocks at their own seams.
 */
export type TestConvexDb = TestConvex<typeof schema>;

const convexRoot = fileURLToPath(new URL("../../convex", import.meta.url));

/** Bun has no `import.meta.glob`, so the module map is built from disk. */
const modules: Record<string, () => Promise<unknown>> = Object.fromEntries(
	readdirSync(convexRoot, { recursive: true, encoding: "utf8" })
		.filter((path) => path.endsWith(".ts"))
		.map((path) => [
			`../../convex/${path}`,
			() => import(`../../convex/${path}`),
		]),
);

/**
 * With `transactionLimits`, every transaction is held to Convex's
 * per-transaction limits: `true` for the defaults, or the defaults with the
 * given limits tightened.
 */
export function createTestConvex(
	options: { readonly transactionLimits?: true | TransactionLimits } = {},
): TestConvexDb {
	return options.transactionLimits === undefined
		? convexTest(schema, modules)
		: convexTest({
				schema,
				modules,
				transactionLimits: options.transactionLimits,
			});
}

/** The stand-in with some Convex modules replaced, keyed by their path under convex/. */
export function createTestConvexWith(
	replaced: Record<string, () => Promise<unknown>>,
): TestConvexDb {
	return convexTest(schema, {
		...modules,
		...Object.fromEntries(
			Object.entries(replaced).map(([path, load]) => [
				`../../convex/${path}`,
				load,
			]),
		),
	});
}

/**
 * The stand-in with the playground fixtures from tooling/ registered as the
 * `playgroundFixtures` module, reachable through `playgroundFixtures`.
 */
export function createPlaygroundConvex(): TestConvexDb {
	return createTestConvexWith({
		"playgroundFixtures.ts": () =>
			import("../../tooling/playground-fixtures"),
	});
}

export const playgroundFixtures = {
	load: makeFunctionReference<"mutation">("playgroundFixtures:load"),
	consolidateExamples: makeFunctionReference<"mutation">(
		"playgroundFixtures:consolidateExamples",
	),
	playground: makeFunctionReference<"query">("playgroundFixtures:playground"),
};

/** Loading the ~3,500 playground fixture rows takes a few seconds. */
export const PLAYGROUND_FIXTURE_TIMEOUT_MS = 30_000;

/**
 * An action context whose hops run the real registered functions. It replaces
 * mocks that dispatched hops by function-name string, so a renamed or removed
 * hop fails the test instead of passing silently.
 */
export function actionContext(t: TestConvexDb) {
	return {
		runQuery: t.query,
		runMutation: t.mutation,
		runAction: t.action,
	};
}

type SegmentSpec =
	| string
	| {
			readonly kind:
				| "ResolvableText"
				| "OpaqueText"
				| "Whitespace"
				| "Punctuation";
			readonly text: string;
			readonly surface?: string;
	  };

function segmentKind(text: string) {
	if (/^\s+$/.test(text)) return "Whitespace" as const;
	if (/^\p{P}+$/u.test(text)) return "Punctuation" as const;
	return "ResolvableText" as const;
}

/**
 * Stores one Visitor-submitted German Text through the production mutation.
 * Plain strings become Segments whose kind follows their characters, so
 * `["Ich", " ", "gehe", "."]` is four Segments.
 */
export async function submitText(
	t: TestConvexDb,
	sentences: readonly (readonly SegmentSpec[])[],
	options: { readonly submissionKey?: string } = {},
): Promise<{
	textId: Id<"texts">;
	sentenceIds: Id<"sentences">[];
	segmentIds: Id<"segments">[][];
}> {
	const stored = sentences.map((segments) =>
		segments.map((segment) =>
			typeof segment === "string"
				? { kind: segmentKind(segment), text: segment }
				: segment,
		),
	);
	const sourceText = stored
		.map((segments) => segments.map(({ text }) => text).join(""))
		.join(" ");
	const { textId, sentenceIds } = await t.mutation(
		internal.persistence.persistSubmittedText,
		{
			submissionKey: options.submissionKey ?? sourceText,
			sourceText,
			sentences: stored.map((segments, position) => ({
				segmentedSentenceId: `${options.submissionKey ?? sourceText}:${position}`,
				position,
				paragraph: 0,
				language: "de" as const,
				stitchedText: segments.map(({ text }) => text).join(""),
				segments: segments.map((segment) => ({ ...segment })),
			})),
		},
	);
	const segmentIds = await t.run((ctx) =>
		Promise.all(
			sentenceIds.map(async (sentenceId) =>
				(
					await ctx.db
						.query("segments")
						.withIndex("by_sentence_id_and_index", (q) =>
							q.eq("sentenceId", sentenceId),
						)
						.collect()
				).map(({ _id }) => _id),
			),
		),
	);
	return { textId, sentenceIds, segmentIds };
}
