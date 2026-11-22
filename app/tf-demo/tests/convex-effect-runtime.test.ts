import { expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { internal } from "../convex/_generated/api";
import {
	ConvexActionCtx,
	inspectedQuery,
	isVisitorActionError,
	runConvexEffect,
	VisitorActionError,
	VisitorErrorCode,
} from "../convex/model/convexEffect";
import type { ActionInspection } from "../convex/model/inspectionAction";
import {
	annotateInspectionStep,
	createInspectionCapture,
} from "../server/inspectionCapture";
import { inspectionJson } from "../server/inspectionPayload";
import {
	KnowledgeProductionUnavailableError,
	KnowledgePublicationRejected,
	KnowledgeRunError,
	KnowledgeStageError,
	UnsupportedKnowledgeLanguage,
} from "../server/knowledgeRunErrors";
import { actionContext, createTestConvex } from "./support/convex";

test("runConvexEffect translates typed VisitorActionError to a coded ConvexError and flushes inspection after root span closes", async () => {
	const t = createTestConvex();
	const capture = createInspectionCapture();
	const flushedNames: string[] = [];
	const inspection: ActionInspection = Object.assign(capture, {
		async flush() {
			flushedNames.push(...capture.steps.map((step) => step.name));
		},
	});
	const failingRoot = Effect.fn("Root action", { root: true })(function* () {
		yield* annotateInspectionStep("app/tf-demo", { action: "test" });
		return yield* new VisitorActionError({
			code: "NotConfigured",
			visitorMessage: "Missing deployment key.",
		});
	});

	const caught = await runConvexEffect(actionContext(t), failingRoot(), {
		inspection,
	}).then(
		() => undefined,
		(error: unknown) => error,
	);

	expect(caught).toBeInstanceOf(ConvexError);
	expect(caught).toMatchObject({
		data: { code: "NotConfigured", message: "Missing deployment key." },
	});
	// Flush runs after the root span closed, so the root step is included.
	expect(flushedNames).toEqual(["Root action"]);
	expect(capture.steps[0]?.status).toBe("Failure");
	expect(
		JSON.parse(capture.steps[0]?.payloadJson ?? "null").error,
	).toMatchObject({
		_tag: "VisitorActionError",
		code: "NotConfigured",
		name: "VisitorActionError",
		message: "Missing deployment key.",
	});
});

test("ConvexActionCtx keeps Convex DB hops inside the Effect fiber tree under the enclosing inspection root", async () => {
	const t = createTestConvex();
	const capture = createInspectionCapture();
	const inspection: ActionInspection = Object.assign(capture, {
		async flush() {},
	});
	const runQuery = Effect.fn("Load test query", { root: true })(function* () {
		yield* annotateInspectionStep("app/tf-demo", { kind: "root" });
		const ctx = yield* ConvexActionCtx;
		const keys = yield* inspectedQuery(
			"Check answered keys",
			"app/tf-demo",
			{ requestKeys: [] },
			internal.lunaAheadBatches.answeredKeys,
			{ requestKeys: [] },
		);
		const direct = yield* ctx.runQuery(
			internal.lunaAheadBatches.answeredKeys,
			{ requestKeys: [] },
		);
		return { keys, direct };
	});

	const result = await runConvexEffect(actionContext(t), runQuery(), {
		inspection,
	});
	expect(result).toEqual({ keys: [], direct: [] });
	const root = capture.steps.find((step) => step.name === "Load test query");
	const hop = capture.steps.find(
		(step) => step.name === "Check answered keys",
	);
	expect(root?.parentId).toBeUndefined();
	expect(hop?.parentId).toBe(root?.id);
	expect(hop?.status).toBe("Success");
});

const isVisitorErrorCode = Schema.is(VisitorErrorCode);
const encodeVisitorActionError = Schema.encodeSync(VisitorActionError);
const isKnowledgeRunError = Schema.is(KnowledgeRunError);
const encodeKnowledgeRunError = Schema.encodeSync(KnowledgeRunError);

test("serialized error schemas keep bounded structured attributes and preserve raw defects only in cause", () => {
	expect(isVisitorErrorCode("NotConfigured")).toBe(true);
	const visitorErr = new VisitorActionError({
		code: "RateLimited",
		visitorMessage: "Please wait.",
	});
	expect(isVisitorActionError(visitorErr)).toBe(true);
	expect(encodeVisitorActionError(visitorErr)).toEqual({
		_tag: "VisitorActionError",
		code: "RateLimited",
		visitorMessage: "Please wait.",
	});

	const errors: readonly KnowledgeRunError[] = [
		new KnowledgeProductionUnavailableError({
			reason: "ProductionFlagOff",
		}),
		new UnsupportedKnowledgeLanguage({ language: "fr" }),
		new KnowledgePublicationRejected({
			attemptKey: "attempt-1",
			final: true,
			cause: new Error("secret internal planner detail"),
		}),
		new KnowledgeStageError({
			phase: "Publish",
			attemptKey: "attempt-1",
			cause: new TypeError("secret raw payload"),
		}),
	];

	for (const error of errors) {
		expect(isKnowledgeRunError(error)).toBe(true);
		expect(error.message).not.toContain("secret");
		const encoded = encodeKnowledgeRunError(error);
		expect(encoded._tag).toBe(error._tag);
	}

	const stageJson = JSON.parse(inspectionJson({ error: errors[3] }));
	expect(stageJson.error).toMatchObject({
		_tag: "KnowledgeStageError",
		phase: "Publish",
		attemptKey: "attempt-1",
		name: "KnowledgeStageError",
		message: "Knowledge generation failed during 'Publish'.",
		cause: { name: "TypeError", message: "secret raw payload" },
	});
});
