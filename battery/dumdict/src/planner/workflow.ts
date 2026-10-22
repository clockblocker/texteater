import type * as Dumling from "dumling/types";

import type { PlanMutationResult } from "../core/plan-mutation";
import type { PlanMutationRejected } from "../core/plan-mutation/result";
import type { DumdictPlan } from "../domain-types";
import type {
	AffectedDictionaryEntities,
	DumdictPlanIssue,
	MutationRejectedCode,
	MutationSummary,
} from "../public";
import { retainDumdictPlan } from "../validation-semantics";

export type DumdictPlanned<L extends Dumling.Language> = Readonly<{
	status: "planned";
	plan: DumdictPlan<L>;
	affected: AffectedDictionaryEntities<L>;
	summary: MutationSummary;
	/** Stored data the plan worked around; absent when there is none. */
	issues?: readonly DumdictPlanIssue<L>[];
}>;

export type DumdictPlanRejected = Readonly<{
	status: "rejected";
	code: MutationRejectedCode;
	message?: string;
}>;

/** The loaded slice no longer supports the request, so planning stopped. */
export type DumdictPlanConflict = Readonly<{
	status: "conflict";
	code: "revisionConflict" | "semanticPreconditionFailed";
	message?: string;
}>;

export type DumdictPlanOutcome<L extends Dumling.Language> =
	| DumdictPlanned<L>
	| DumdictPlanRejected
	| DumdictPlanConflict;

type Refusal = DumdictPlanRejected | DumdictPlanConflict;

/** A request check passes the request to plan with, or refuses it. */
export type Checked<Request> =
	| { readonly status: "ok"; readonly request: Request }
	| Refusal;

/**
 * One dictionary workflow. `check` runs on the request alone; `plan` validates
 * the host-loaded slice against the checked request and plans over it.
 */
export type Workflow<L extends Dumling.Language, Request, Slice> = {
	readonly check: (request: Request) => Checked<Request>;
	readonly plan: (slice: Slice, request: Request) => DumdictPlanOutcome<L>;
};

export function ok<Request>(request: Request): Checked<Request> {
	return { status: "ok", request };
}

export function rejected(
	code: MutationRejectedCode,
	message: string | undefined,
): DumdictPlanRejected {
	return {
		status: "rejected",
		code,
		...(message === undefined ? {} : { message }),
	};
}

export function invalidRequest(message: string): DumdictPlanRejected {
	return rejected("invalidRequest", message);
}

/**
 * A workflow's outcome. Every workflow parses its request on the way in, and
 * its slice validation parses every stored value it reads, so a plan holds
 * only checked values and isn't parsed again: the host parses each change at
 * its write boundary (`parseAsPlannedChangeOp`).
 */
export function planned<L extends Dumling.Language>(
	plan: PlanMutationResult<L> | PlanMutationRejected,
	issues: readonly DumdictPlanIssue<L>[] = [],
): DumdictPlanOutcome<L> {
	if (plan.status === "rejected") return rejected(plan.code, plan.message);
	const checked: DumdictPlan<L> = retainDumdictPlan({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	});
	return {
		status: "planned",
		...structuredClone({
			plan: checked,
			affected: plan.affected,
			summary: plan.summary,
			...(issues.length > 0 ? { issues } : {}),
		}),
	};
}

export function run<L extends Dumling.Language, Request, Slice>(
	workflow: Workflow<L, Request, Slice>,
	slice: Slice,
	request: Request,
): DumdictPlanOutcome<L> {
	const checked = workflow.check(request);
	return checked.status === "ok"
		? workflow.plan(slice, checked.request)
		: checked;
}
