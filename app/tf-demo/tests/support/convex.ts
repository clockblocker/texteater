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

const convexRoot = `${import.meta.dir}/../../convex`;

/** Bun has no `import.meta.glob`, so the module map is built from disk. */
const modules: Record<string, () => Promise<unknown>> = Object.fromEntries(
	[...new Bun.Glob("**/*.ts").scanSync(convexRoot)].map((path) => [
		`../../convex/${path}`,
		() => import(`../../convex/${path}`),
	]),
);

export function createTestConvex(): TestConvexDb {
	return convexTest(schema, modules);
}

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
