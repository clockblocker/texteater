/** The fake jev and the `segment.inUnits` runner the inUnits tests share. */
import * as Effect from "effect/Effect";
import type { LunaAsk } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import type { Answer } from "../../src/segment/ask.js";
import type { InUnitsInput } from "../../src/segment/in-units.js";
import type { JevAsk, JevRequest } from "../../src/segment/jev.js";
import type { SegmentedText } from "../../src/segment/segmented-sentence.js";
import { type FakeDumgenOptions, liveOver } from "../live-over.js";

export type Sent = JevRequest & { readonly stage: string };

/**
 * A jev that answers by question id from `answers` and otherwise says no:
 * a Noul 0.1, a Choice its last option (`none`, `Other`, …). `fail` makes a
 * stage's requests throw, and `retype` answers a question with the other
 * type.
 */
export function fakeJev(
	options: {
		readonly answers?: Readonly<Record<string, Answer>>;
		readonly fail?: (stage: string, request: JevRequest) => boolean;
		readonly model?: string;
		readonly drop?: (id: string) => boolean;
		readonly retype?: (id: string) => boolean;
	} = {},
) {
	const sent: Sent[] = [];
	let inFlight = 0;
	let mostInFlight = 0;
	const ask: JevAsk = async (request, { stage }) => {
		sent.push({ ...request, stage });
		inFlight++;
		mostInFlight = Math.max(mostInFlight, inFlight);
		await new Promise((resolve) => setTimeout(resolve, 1));
		inFlight--;
		if (options.fail?.(stage, request)) throw Error("jev is down");
		const answers: Record<string, Answer> = {};
		for (const [id, question] of Object.entries(request.questions)) {
			if (options.drop?.(id)) continue;
			const known = options.answers?.[id];
			if (known) answers[id] = known;
			else if (
				(question.type === "noul") !==
				(options.retype?.(id) ?? false)
			)
				answers[id] = { type: "noul", noul: 0.1 };
			else {
				const keys = Object.keys(
					question.type === "choice" ? question.criteria : {},
				);
				answers[id] = picked(keys.at(-1) ?? "");
			}
		}
		return {
			model: options.model ?? request.model,
			answers,
			usage: {
				input_tokens: 10 * Object.keys(request.questions).length,
				output_tokens: 1,
			},
		};
	};
	return { ask, sent, mostInFlight: () => mostInFlight };
}

export const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

/** Segmentation never reaches Luna; this one fails the test if it does. */
export const noLuna: LunaAsk = async () => {
	throw Error("segmentation asked Luna");
};

/** Runs `segment.inUnits` once and keeps the traces it reported. */
export async function inUnits(
	options: Omit<FakeDumgenOptions, "luna">,
	input: InUnitsInput,
): Promise<{ text: SegmentedText; traces: OperationTrace[] }> {
	const traces: OperationTrace[] = [];
	const text = await Effect.runPromise(
		operations.segment.inUnits(input).pipe(
			Effect.provide(
				liveOver({
					...options,
					luna: noLuna,
					onOperation: (trace) => traces.push(trace),
				}),
			),
		),
	);
	return { text, traces };
}
