import {
	type BatchLine,
	type BatchRequest,
	type BatchState,
	type JevAsk,
	JevTransport,
	type LunaAsk,
	type LunaBatch,
	type LunaRequest,
	LunaTransport,
	type OperationTrace,
	operations,
	TraceSink,
} from "dumgen";
import * as Effect from "effect/Effect";
import { internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { parsedResolutionContext } from "../../convex/model/clickOrchestrator";
import {
	clickDumgen,
	replaceModelTransports,
} from "../../convex/model/deploymentDumgen";
import { clickGrammarInputOf } from "../../server/clickGrammarInput";
import { dumgenGrammarInput } from "../../server/dumgenClickResolution";
import type { TestConvexDb } from "./convex";

/* A fake OpenAI Batch API, Luna and jev for the Luna ahead batch (#1351). */

/** A completed Responses API body whose output is `{"value": value}`. */
export const responseBody = (value: unknown) =>
	JSON.stringify({
		status: "completed",
		model: "gpt-5.6-luna",
		output: [
			{
				type: "message",
				content: [
					{ type: "output_text", text: JSON.stringify({ value }) },
				],
			},
		],
		usage: {
			input_tokens: 1500,
			output_tokens: 20,
			input_tokens_details: { cached_tokens: 1400 },
		},
	});

/**
 * A Batch API that keeps what it was sent and ends each batch as the test
 * says: `answer` writes a line's body, or undefined for an error line.
 */
export function fakeLunaBatch() {
	const sent: BatchRequest[][] = [];
	let status = "in_progress";
	let answer: (request: LunaRequest) => string | undefined = () => undefined;
	const batch: LunaBatch = {
		async submit(requests) {
			sent.push([...requests]);
			return { id: `batch_${sent.length}`, inputFileId: "file-in" };
		},
		async check(id): Promise<BatchState> {
			return {
				id,
				status,
				final: ["completed", "failed", "expired", "cancelled"].includes(
					status,
				),
				errors: status === "failed" ? "The input was invalid." : "",
			};
		},
		async lines(state): Promise<BatchLine[]> {
			const index = Number(state.id.replace("batch_", "")) - 1;
			return (sent[index] ?? []).map(({ customId, request }) => {
				const body = answer(request);
				return body === undefined
					? { customId, ok: false, message: "The line failed." }
					: { customId, ok: true, body };
			});
		},
		settle() {
			throw Error("A host does not wait on a batch");
		},
	};
	return {
		batch,
		sent,
		end(
			ended: string,
			answering: (request: LunaRequest) => string | undefined = () =>
				undefined,
		) {
			status = ended;
			answer = answering;
		},
	};
}

/** The member texts a canonical request asks about; an emoji draft asks about none. */
export const membersOf = (request: LunaRequest) =>
	(
		(request.input as { members?: readonly { text: string }[] }).members ??
		[]
	).map(({ text }) => text);

/** A jev that answers each Choice with its first option, as a sure judge would. */
const firstOptionJev: JevAsk = async (request) => ({
	model: request.model,
	answers: Object.fromEntries(
		Object.entries(request.questions).map(([id, question]) => {
			const choice =
				question.type === "choice"
					? (Object.keys(question.criteria)[0] ?? "")
					: "";
			return [
				id,
				{
					type: "choice" as const,
					choice,
					confidence: 1,
					probabilities: { [choice]: 1 },
				},
			];
		}),
	),
	usage: { input_tokens: 10, output_tokens: 1 },
});

/** Whether the request is the standalone Emoji Description draft of a headword code wrote. */
export const isEmojiDraft = (request: LunaRequest) =>
	"markedSentence" in (request.input as object) &&
	membersOf(request).length === 0;

/**
 * A Luna that writes each member as it stands, drafts 🔁 as an Emoji
 * Description, and records each stage it was asked.
 */
function recordingLuna() {
	const stages: string[] = [];
	const ask: LunaAsk = async (request, { stage }) => {
		stages.push(stage);
		const members = membersOf(request);
		return {
			output: isEmojiDraft(request)
				? "🔁"
				: { canonicalForm: members.join(" "), members },
			metadata: { usage: { input_tokens: 1500, output_tokens: 20 } },
		};
	};
	return { ask, stages };
}

/** The deployment's transports: the fakes, until `restore`. */
export function fakeDeployment(batch: LunaBatch | undefined) {
	const luna = recordingLuna();
	const restore = replaceModelTransports({
		jev: () => JevTransport.fromAsk(firstOptionJev),
		luna: () => LunaTransport.fromAsk(luna.ask),
		...(batch ? { lunaBatch: () => batch } : {}),
	});
	return { luna, restore };
}

/**
 * A click's Grammar on the Segment, as a click's action runs it: its
 * Resolution Context loaded, its input built, under the click's Dumgen
 * whose Luna requests asked ahead are answered from the stored batch
 * answers. Returns its trace, and its calls of each stage asked ahead.
 */
export async function clickGrammar(
	t: TestConvexDb,
	sentenceId: Id<"sentences">,
	clickedSegmentIndex: number,
) {
	const context = parsedResolutionContext(
		await t.query(internal.resolutionContext.load, {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex,
		}),
	);
	const input = dumgenGrammarInput(
		clickGrammarInputOf(context, clickedSegmentIndex),
	);
	if (!input) throw Error("Expected a routed unit");
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		operations.resolve.grammar(input).pipe(
			Effect.provideService(TraceSink, (trace) => traces.push(trace)),
			Effect.provide(
				clickDumgen(
					async (requestKey) =>
						(await t.query(internal.lunaAheadBatches.storedAnswer, {
							requestKey,
						})) ?? undefined,
				),
			),
		),
	);
	const [trace] = traces;
	const calls = (stage: string) =>
		(trace?.calls ?? []).filter((call) => call.stage === stage);
	return {
		result,
		trace,
		canonical: calls("canonical"),
		emojiDescription: calls("emojiDescription"),
	};
}
