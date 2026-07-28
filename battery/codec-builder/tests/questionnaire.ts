import { z } from "zod";

export const QuestionnaireAnswerPairSchema = z.object({
	answer: z.string().nullable(),
	comment: z.string().nullable(),
});

export const AbstractQuestionnaireAnswersSchema = z.record(
	z.string(),
	QuestionnaireAnswerPairSchema,
);

export const QuestionnaireMetaForServerShapeReconstructionSchema = z
	.object({
		serverShapeVersion: z.number().int().nonnegative(),
		source: z.string(),
	})
	.passthrough();

export const AbstractQuestionnaireSchema = z.object({
	answers: AbstractQuestionnaireAnswersSchema,
	meta: QuestionnaireMetaForServerShapeReconstructionSchema,
});

type AbstractQuestionnaire = z.infer<typeof AbstractQuestionnaireSchema>;

type QuestionIds = readonly [string, ...string[]];

export function questionnaireOf<const TQuestionIds extends QuestionIds>(
	questionIds: TQuestionIds,
) {
	const answersShape = Object.fromEntries(
		questionIds.map((questionId) => [
			questionId,
			QuestionnaireAnswerPairSchema,
		]),
	) as { [K in TQuestionIds[number]]: typeof QuestionnaireAnswerPairSchema };

	const concreteSchema = z
		.object({
			answers: z.object(answersShape).strict(),
			meta: QuestionnaireMetaForServerShapeReconstructionSchema,
		})
		.strict();

	return concreteSchema;
}

export const SupermarketQuestionnaireSchema = questionnaireOf([
	"q1",
	"q2",
	"q3",
	"q4",
	"q5",
	"q6",
] as const);

type SupermarketQuestionnaire = z.infer<typeof SupermarketQuestionnaireSchema>;
type SupermarketAnswers = SupermarketQuestionnaire["answers"];

const _supermarketQ1: SupermarketAnswers["q1"] = {
	answer: "Yes",
	comment: null,
};
const _supermarketQ6: SupermarketAnswers["q6"] = {
	answer: null,
	comment: "not sure",
};

// @ts-expect-error concrete keys are preserved, q7 should not exist
type _NoQ7 = SupermarketAnswers["q7"];

const _asAbstract: AbstractQuestionnaire = {
	answers: {
		q1: _supermarketQ1,
		q6: _supermarketQ6,
	},
	meta: {
		serverShapeVersion: 1,
		source: "supermarket",
		extra: true,
	},
};

void _asAbstract;
