import { describe, expect, test } from "bun:test";

import { RUNTIME_PROMPT_CATALOG } from "../../src/catalog/runtime-prompt-catalog";
import { additionalIndicesAdapter } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/representation";
import {
	createGermanHighLevelTargetClassificationProjection,
	type GermanHighLevelTargetClassificationInput,
	type GermanHighLevelTargetClassificationModelInput,
	type GermanHighLevelTargetClassificationModelOutput,
	type GermanHighLevelTargetClassificationTarget,
} from "../../src/target-classification/de/high-level-target-classification-projection";

const input = {
	clickedSegmentIndex: 5,
	segments: [
		{ kind: "ResolvableText", text: "auf&" },
		{ kind: "Whitespace", text: " " },
		{ kind: "OpaqueText", text: "<x>" },
		{ kind: "Punctuation", text: "," },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "passen" },
	],
} satisfies GermanHighLevelTargetClassificationInput;

const modelInput = {
	clickedIndex: 3,
	markedSentence: "auf&amp; &lt;x&gt;, <target>passen</target>",
	segments: [
		{ i: 0, s: "auf&" },
		{ i: 3, s: "passen" },
	],
} satisfies GermanHighLevelTargetClassificationModelInput;

const modelOutput = {
	additionalMemberIndices: [0],
	decision: "Resolved",
	target: { family: "Lexeme", kind: "VERB" },
} satisfies GermanHighLevelTargetClassificationModelOutput;

const canonicalTarget = {
	family: "Lexeme",
	kind: "VERB",
	memberSegmentIndices: [0, 5],
} satisfies GermanHighLevelTargetClassificationTarget;

describe("German High-Level Target Classification Projection", () => {
	test("owns compact indexing, marked context, and ordered target restoration", () => {
		const projection =
			createGermanHighLevelTargetClassificationProjection(input);

		expect(projection.modelInput).toEqual(modelInput);
		expect(projection.canonicalize(modelOutput)).toEqual(canonicalTarget);
		expect(projection.materialize(canonicalTarget)).toEqual(modelOutput);
	});

	test("enforces click membership and ResolvableText membership at its interface", () => {
		const projection =
			createGermanHighLevelTargetClassificationProjection(input);

		expect(() =>
			projection.canonicalize({
				...modelOutput,
				additionalMemberIndices: [3],
			}),
		).toThrow("Additional membership must exclude the clicked index.");
		expect(() =>
			projection.canonicalize({
				...modelOutput,
				additionalMemberIndices: [1],
			}),
		).toThrow("Membership must reference ResolvableText.");
		expect(() =>
			projection.materialize({
				...canonicalTarget,
				memberSegmentIndices: [0],
			}),
		).toThrow("Canonical membership must include the clicked member.");
		expect(() =>
			createGermanHighLevelTargetClassificationProjection({
				...input,
				clickedSegmentIndex: 3,
			}),
		).toThrow(
			"The clicked canonical segment is not a ResolvableText candidate.",
		);
	});

	test("preserves the unresolved projection in both directions", () => {
		const projection =
			createGermanHighLevelTargetClassificationProjection(input);
		const unresolved = { decision: "Unresolved" as const };
		const privateUnresolved = {
			additionalMemberIndices: null,
			decision: "Unresolved" as const,
			target: null,
		};

		expect(projection.canonicalize(privateUnresolved)).toEqual(unresolved);
		expect(projection.materialize(unresolved)).toEqual(privateUnresolved);
	});
});

describe("German target projection adapter bindings", () => {
	test("the Prompt Representation Adapter binds schemas and codecs to the projection", () => {
		const materialized = additionalIndicesAdapter.materialize({
			input,
			idealOutput: { decision: "Resolved", target: canonicalTarget },
		});

		expect(materialized).toEqual({
			input: modelInput,
			idealOutput: modelOutput,
		});
		expect(
			additionalIndicesAdapter.canonicalize({
				canonicalInput: input,
				privateInput: materialized.input,
				output: materialized.idealOutput,
			}),
		).toEqual({ decision: "Resolved", target: canonicalTarget });
	});

	test("the generated runtime dispatch binds input and output to the projection", () => {
		const prompt =
			RUNTIME_PROMPT_CATALOG.laboratory.targetClassification.de
				.highLevelWholeUnit.prompt;
		const parsedInput = prompt.inputSchema.parse(input);
		const parsedOutput = prompt.outputSchema?.parse(modelOutput);

		expect(prompt.projectInput?.(parsedInput)).toEqual(modelInput);
		expect(prompt.projectOutput?.(parsedInput, parsedOutput)).toEqual(
			canonicalTarget,
		);
	});
});
