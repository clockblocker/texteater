import { describe, expect, test } from "bun:test";
import { z } from "zod/v3";
import { buildReshapeCodec } from "../src/v3/codec-builders/build-reshape-codec";

// -- Assertions --

type IsUnknown<T> = unknown extends T
	? [T] extends [unknown]
		? true
		: false
	: false;
type Assert<T extends true> = T;
type AssertFalse<T extends false> = T;

const questionnaireServerSchema = z.object({
	ans_to_q1: z.string(),
	comment_to_q1_: z.string(),
	id: z.number(),
	dateOfConstruction: z.string(),
	answers: z.array(
		z.object({
			ans_to_q2: z.string(),
			comment_to_q2_: z.string(),
		}),
	),
});

const addQuestionnaireFieldCodec = buildReshapeCodec(
	questionnaireServerSchema,
	{
		fieldName: "questionnaire",
		fieldSchema: z.object({
			q1: z.object({ answer: z.string(), comment: z.string() }),
			q2: z.object({ answer: z.string(), comment: z.string() }),
		}),
		dropFields: ["ans_to_q1", "comment_to_q1_", "answers"],
		construct: (input) => ({
			q1: {
				answer: input.ans_to_q1,
				comment: input.comment_to_q1_,
			},
			q2: {
				answer: input.answers[0]?.ans_to_q2 ?? "",
				comment: input.answers[0]?.comment_to_q2_ ?? "",
			},
		}),
		reconstruct: (questionnaire) => ({
			ans_to_q1: questionnaire.q1.answer,
			comment_to_q1_: questionnaire.q1.comment,
			answers: [
				{
					ans_to_q2: questionnaire.q2.answer,
					comment_to_q2_: questionnaire.q2.comment,
				},
			],
		}),
	},
);

buildReshapeCodec(questionnaireServerSchema, {
	fieldName: "questionnaire",
	fieldSchema: z.object({
		q1: z.object({ answer: z.string(), comment: z.string() }),
		q2: z.object({ answer: z.string(), comment: z.string() }),
	}),
	dropFields: ["ans_to_q1", "comment_to_q1_", "answers"],
	construct: (input) => ({
		q1: {
			answer: input.ans_to_q1,
			comment: input.comment_to_q1_,
		},
		q2: {
			answer: input.answers[0]?.ans_to_q2 ?? "",
			comment: input.answers[0]?.comment_to_q2_ ?? "",
		},
	}),
	// @ts-expect-error reconstruct must return every dropped source field
	reconstruct: (questionnaire) => ({
		ans_to_q1: questionnaire.q1.answer,
		comment_to_q1_: questionnaire.q1.comment,
	}),
});

type AddQuestionnaireFieldOutput = z.infer<
	typeof addQuestionnaireFieldCodec.outputSchema
>;
const addQuestionnaireFieldValue: AddQuestionnaireFieldOutput["questionnaire"] =
	{
		q1: { answer: "Yes", comment: "ok" },
		q2: { answer: "No", comment: "ok" },
	};
type _addQuestionnaireFieldIdIsNotUnknown = AssertFalse<
	IsUnknown<AddQuestionnaireFieldOutput["id"]>
>;
type _addQuestionnaireFieldIdMatches = Assert<
	AddQuestionnaireFieldOutput["id"] extends number ? true : false
>;
// @ts-expect-error dropped source key should not be present in output
const addQuestionnaireDroppedAnsToQ1: AddQuestionnaireFieldOutput["ans_to_q1"] =
	"Yes";

const dropQuestionnaireFieldsFromVariable: Array<
	keyof z.infer<typeof questionnaireServerSchema>
> = ["ans_to_q1", "comment_to_q1_", "answers"];
const addQuestionnaireFieldCodecFromVariableDropFields = buildReshapeCodec(
	questionnaireServerSchema,
	{
		fieldName: "questionnaire",
		fieldSchema: z.object({
			q1: z.object({ answer: z.string(), comment: z.string() }),
			q2: z.object({ answer: z.string(), comment: z.string() }),
		}),
		dropFields: dropQuestionnaireFieldsFromVariable,
		construct: (input) => ({
			q1: {
				answer: input.ans_to_q1,
				comment: input.comment_to_q1_,
			},
			q2: {
				answer: input.answers[0]?.ans_to_q2 ?? "",
				comment: input.answers[0]?.comment_to_q2_ ?? "",
			},
		}),
		reconstruct: (questionnaire) => ({
			ans_to_q1: questionnaire.q1.answer,
			comment_to_q1_: questionnaire.q1.comment,
			answers: [
				{
					ans_to_q2: questionnaire.q2.answer,
					comment_to_q2_: questionnaire.q2.comment,
				},
			],
		}),
	},
);
type AddQuestionnaireFieldOutputFromVariableDropFields = z.infer<
	typeof addQuestionnaireFieldCodecFromVariableDropFields.outputSchema
>;
type _addQuestionnaireVariableDropFieldsIdIsNotUnknown = AssertFalse<
	IsUnknown<AddQuestionnaireFieldOutputFromVariableDropFields["id"]>
>;
type _addQuestionnaireVariableDropFieldsIdMatches = Assert<
	AddQuestionnaireFieldOutputFromVariableDropFields["id"] extends
		| number
		| undefined
		? true
		: false
>;

type QuestionnaireServerValue = z.infer<typeof questionnaireServerSchema>;
type QuestionnaireReshapedValue = z.infer<
	typeof addQuestionnaireFieldCodec.outputSchema
>;
type QuestionnaireReshapedValueFromVariableDropFields = z.infer<
	typeof addQuestionnaireFieldCodecFromVariableDropFields.outputSchema
>;

const questionnaireServerValue = {
	ans_to_q1: "Yes",
	comment_to_q1_: "Because",
	id: 1,
	dateOfConstruction: "2024-01-01",
	answers: [{ ans_to_q2: "No", comment_to_q2_: "Later" }],
} satisfies QuestionnaireServerValue;

const questionnaireReshapedValue = {
	id: 1,
	dateOfConstruction: "2024-01-01",
	questionnaire: {
		q1: { answer: "Yes", comment: "Because" },
		q2: { answer: "No", comment: "Later" },
	},
} satisfies QuestionnaireReshapedValue;

// -- Tests --

describe("buildReshapeCodec", () => {
	test("constructs the reshaped field and drops the configured source fields", () => {
		const output = addQuestionnaireFieldCodec.fromInput(
			questionnaireServerValue,
		) satisfies QuestionnaireReshapedValue;

		expect(output).toEqual(questionnaireReshapedValue);
		expect(addQuestionnaireFieldCodec.outputSchema.parse(output)).toEqual(
			output,
		);
	});

	test("reconstructs dropped fields from the reshaped output", () => {
		expect(
			addQuestionnaireFieldCodec.fromOutput(questionnaireReshapedValue),
		).toEqual(questionnaireServerValue);
	});

	test("applies runtime dropping even when dropFields comes from a variable", () => {
		const output =
			addQuestionnaireFieldCodecFromVariableDropFields.fromInput(
				questionnaireServerValue,
			) satisfies QuestionnaireReshapedValueFromVariableDropFields;

		expect(output.id).toBe(questionnaireReshapedValue.id);
		expect(output.dateOfConstruction).toBe(
			questionnaireReshapedValue.dateOfConstruction,
		);
		expect(output.questionnaire).toEqual(
			questionnaireReshapedValue.questionnaire,
		);
		expect("ans_to_q1" in output).toBeFalse();
		expect("comment_to_q1_" in output).toBeFalse();
		expect("answers" in output).toBeFalse();
		expect(
			addQuestionnaireFieldCodecFromVariableDropFields.fromOutput(output),
		).toEqual(questionnaireServerValue);
	});
});

void addQuestionnaireFieldValue;
void addQuestionnaireDroppedAnsToQ1;
