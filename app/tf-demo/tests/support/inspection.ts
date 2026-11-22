import { api } from "../../convex/_generated/api";
import { submitText, type TestConvexDb } from "./convex";
import { type Selection, sessionGuard } from "./occurrences";

export const SELECTION =
	"Select segment and schedule resolution [Code · app/tf-demo · resolutionSessions.selectSegment · Success]";

export async function savedSteps(t: TestConvexDb, requestId: string) {
	const steps = await t.run((ctx) =>
		ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_started_at", (q) =>
				q.eq("requestId", requestId),
			)
			.collect(),
	);
	return Promise.all(
		steps.map(async (step) => ({
			...step,
			payload: JSON.parse(
				(
					await t.run((ctx) =>
						ctx.db
							.query("inspectionPayloads")
							.withIndex("by_step_id_and_part", (q) =>
								q.eq("stepId", step._id),
							)
							.collect(),
					)
				)
					.map(({ text }) => text)
					.join(""),
			),
		})),
	);
}

/**
 * One line per saved step: its ancestry by name, kind, owner and status,
 * sorted, so concurrent steps compare independently of their order.
 */
export async function inspection(t: TestConvexDb, requestId: string) {
	const steps = await savedSteps(t, requestId);
	const byId = new Map(steps.map((step) => [step.id, step]));
	const path = (step: (typeof steps)[number]): string => {
		const parent = step.parentId ? byId.get(step.parentId) : undefined;
		return parent
			? `${path(parent)} > ${step.name}`
			: `${step.parentId ? "? > " : ""}${step.name}`;
	};
	return steps
		.map(
			(step) =>
				`${path(step)} [${step.kind} · ${step.owner} · ${step.status}]`,
		)
		.sort();
}

export async function bankenSource(t: TestConvexDb) {
	const { sentenceIds } = await submitText(t, [["Die", " ", "Banken", "."]]);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a Sentence.");
	return (requestId: string): Selection => ({
		requestId,
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 2,
	});
}

export async function select(
	t: TestConvexDb,
	selection: Selection,
	inspect: boolean,
) {
	await t.mutation(api.resolutionSessions.selectSegment, {
		...selection,
		inspect,
	});
	return sessionGuard(t, selection.requestId);
}
