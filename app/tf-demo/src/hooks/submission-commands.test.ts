import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import {
	isCommandInterrupted,
	runCommandEffect,
	squashCommandFailure,
} from "@/lib/command-scheduler";
import type { Id } from "../../convex/_generated/dataModel";
import {
	MAX_TEXT_FILE_BYTES,
	TEXT_FILE_TOO_LARGE_MESSAGE,
} from "../../shared/text-file-limits";
import { schedulePendingAction } from "./use-pending-action";
import { scheduleTextFileSubmission } from "./use-text-file-submission";
import { scheduleTextOrLinkSubmission } from "./use-text-or-link-submission";

describe("schedulePendingAction", () => {
	test("deduplicates concurrent calls via singleFlight and preserves error recovery", async () => {
		const registry = AtomRegistry.make();
		let resolveCall!: (value: { readonly deleted: number }) => void;
		let executions = 0;

		const run = () =>
			runCommandEffect(
				schedulePendingAction(
					registry,
					"clear-visitor",
					{ visitorId: "v-1" },
					() =>
						new Promise<{ readonly deleted: number }>((resolve) => {
							executions++;
							resolveCall = resolve;
						}),
				),
			);

		const first = run();
		const duplicate = run();
		expect(executions).toBe(1);

		resolveCall({ deleted: 7 });
		const [firstOutcome, duplicateOutcome] = await Promise.all([
			first,
			duplicate,
		]);
		expect(AsyncResult.isSuccess(firstOutcome)).toBe(true);
		expect(AsyncResult.isSuccess(duplicateOutcome)).toBe(true);
		if (AsyncResult.isSuccess(firstOutcome)) {
			expect(firstOutcome.value).toEqual({ deleted: 7 });
		}
		if (AsyncResult.isSuccess(duplicateOutcome)) {
			expect(duplicateOutcome.value).toEqual({ deleted: 7 });
		}

		// A failure preserves the ConvexError and leaves the lane ready for retry.
		const err = new ConvexError({ message: "Reset failed." });
		const failed = await runCommandEffect(
			schedulePendingAction(
				registry,
				"clear-visitor",
				{ visitorId: "v-1" },
				async () => {
					throw err;
				},
			),
		);
		expect(AsyncResult.isFailure(failed)).toBe(true);
		if (AsyncResult.isFailure(failed)) {
			expect(squashCommandFailure(failed)).toBe(err);
		}

		const recovered = await runCommandEffect(
			schedulePendingAction(
				registry,
				"clear-visitor",
				{ visitorId: "v-1" },
				async () => ({ deleted: 3 }),
			),
		);
		expect(AsyncResult.isSuccess(recovered)).toBe(true);
		if (AsyncResult.isSuccess(recovered)) {
			expect(recovered.value).toEqual({ deleted: 3 });
		}
		registry.dispose();
	});
});

describe("scheduleTextOrLinkSubmission", () => {
	test("routes text vs link submissions and deduplicates overlapping calls on one singleFlight lane", async () => {
		const registry = AtomRegistry.make();
		const scrollId = "scroll-1" as Id<"scrolls">;
		const linkScrollId = "scroll-2" as Id<"scrolls">;
		let resolveText!: (value: {
			readonly status: "Accepted";
			readonly scrollId: Id<"scrolls">;
		}) => void;
		let textCalls = 0;
		const linkArgs: unknown[] = [];

		const deps = {
			submitText: () =>
				new Promise<{
					readonly status: "Accepted";
					readonly scrollId: Id<"scrolls">;
				}>((resolve) => {
					textCalls++;
					resolveText = resolve;
				}),
			submitLink: async (args: {
				readonly link: string;
				readonly visitorId: string;
				readonly inspectionVisitorId?: string;
			}) => {
				linkArgs.push(args);
				return {
					status: "Accepted" as const,
					scrollId: linkScrollId,
					title: "Article",
				};
			},
		};

		const first = runCommandEffect(
			scheduleTextOrLinkSubmission(
				registry,
				"library-box",
				{
					visitorId: "v-1",
					submissionKey: "k-1",
					sourceText: "Hallo Welt.",
				},
				deps,
			),
		);
		// Overlapping link submit shares the in-flight submission instead of racing it.
		const overlapping = runCommandEffect(
			scheduleTextOrLinkSubmission(
				registry,
				"library-box",
				{
					visitorId: "v-1",
					submissionKey: "k-2",
					sourceText: "https://example.com/article#top",
				},
				deps,
			),
		);

		resolveText({ status: "Accepted", scrollId });
		const [firstOutcome, overlappingOutcome] = await Promise.all([
			first,
			overlapping,
		]);
		expect(textCalls).toBe(1);
		expect(linkArgs).toHaveLength(0);
		expect(AsyncResult.isSuccess(firstOutcome)).toBe(true);
		expect(AsyncResult.isSuccess(overlappingOutcome)).toBe(true);

		// Once settled, a link submission normalizes the URL and routes to submitLink.
		const linkOutcome = await runCommandEffect(
			scheduleTextOrLinkSubmission(
				registry,
				"library-box",
				{
					visitorId: "v-1",
					inspectionVisitorId: "v-1",
					submissionKey: "k-3",
					sourceText: "  https://example.com/article#section  ",
				},
				deps,
			),
		);
		expect(AsyncResult.isSuccess(linkOutcome)).toBe(true);
		if (AsyncResult.isSuccess(linkOutcome)) {
			expect(linkOutcome.value).toEqual({
				status: "Accepted",
				scrollId: linkScrollId,
				title: "Article",
			});
		}
		expect(linkArgs).toEqual([
			{
				link: "https://example.com/article",
				visitorId: "v-1",
				inspectionVisitorId: "v-1",
			},
		]);
		registry.dispose();
	});
});

describe("scheduleTextFileSubmission", () => {
	test("rejects oversized files before requesting an upload URL", async () => {
		const registry = AtomRegistry.make();
		let uploadUrlCalls = 0;
		const oversized = {
			name: "huge.txt",
			size: MAX_TEXT_FILE_BYTES + 1,
			type: "text/plain",
		} as File;

		const outcome = await runCommandEffect(
			scheduleTextFileSubmission(
				registry,
				"file-lane",
				{ visitorId: "v-1", file: oversized },
				{
					generateUploadUrl: async () => {
						uploadUrlCalls++;
						return "https://upload.example.test";
					},
					submitTextFile: async () => ({
						status: "Rejected",
						message: "unexpected",
					}),
				},
			),
		);

		expect(uploadUrlCalls).toBe(0);
		expect(AsyncResult.isSuccess(outcome)).toBe(true);
		if (AsyncResult.isSuccess(outcome)) {
			expect(outcome.value).toEqual({
				status: "Rejected",
				message: TEXT_FILE_TOO_LARGE_MESSAGE,
			});
		}
		registry.dispose();
	});

	test("deduplicates concurrent uploads via singleFlight and aborts upload fetch on cancellation", async () => {
		const registry = AtomRegistry.make();
		const sectionId = "section-1" as Id<"sections">;
		const storageId = "storage-1" as Id<"_storage">;
		const file = new File(["Hallo Welt"], "story.txt", {
			type: "text/plain",
		});

		const uploadStarted = Deferred.makeUnsafe<void>();
		let resolveUpload!: (response: Response) => void;
		let uploadUrlCalls = 0;
		let uploadCalls = 0;
		let submitCalls = 0;

		const deps = {
			generateUploadUrl: async () => {
				uploadUrlCalls++;
				return "https://upload.example.test/slot";
			},
			uploadFile: () =>
				new Promise<Response>((resolve) => {
					uploadCalls++;
					resolveUpload = resolve;
					Deferred.doneUnsafe(uploadStarted, Exit.void);
				}),
			submitTextFile: async () => {
				submitCalls++;
				return {
					status: "Accepted" as const,
					sectionId,
					title: "story",
				};
			},
		};

		const first = runCommandEffect(
			scheduleTextFileSubmission(
				registry,
				"file-lane",
				{ visitorId: "v-1", file },
				deps,
			),
		);
		const duplicate = runCommandEffect(
			scheduleTextFileSubmission(
				registry,
				"file-lane",
				{ visitorId: "v-1", file },
				deps,
			),
		);

		await Effect.runPromise(Deferred.await(uploadStarted));
		expect(uploadUrlCalls).toBe(1);
		expect(uploadCalls).toBe(1);

		resolveUpload(
			new Response(JSON.stringify({ storageId }), { status: 200 }),
		);
		const [firstOutcome, duplicateOutcome] = await Promise.all([
			first,
			duplicate,
		]);
		expect(submitCalls).toBe(1);
		expect(AsyncResult.isSuccess(firstOutcome)).toBe(true);
		expect(AsyncResult.isSuccess(duplicateOutcome)).toBe(true);

		// Aborting cancels the upload AbortSignal and never calls submitTextFile.
		const abortStarted = Deferred.makeUnsafe<void>();
		const controller = new AbortController();
		let uploadAborted = false;
		let submitAfterAbort = 0;

		const abortedUpload = runCommandEffect(
			scheduleTextFileSubmission(
				registry,
				"file-lane",
				{ visitorId: "v-1", file },
				{
					generateUploadUrl: async () =>
						"https://upload.example.test/slot-2",
					uploadFile: (_url, _file, signal) =>
						new Promise<Response>((_resolve, reject) => {
							Deferred.doneUnsafe(abortStarted, Exit.void);
							signal.addEventListener("abort", () => {
								uploadAborted = true;
								reject(new Error("aborted"));
							});
						}),
					submitTextFile: async () => {
						submitAfterAbort++;
						return {
							status: "Accepted" as const,
							sectionId,
							title: "story",
						};
					},
				},
			),
			{ signal: controller.signal },
		);

		await Effect.runPromise(Deferred.await(abortStarted));
		controller.abort();

		const abortOutcome = await abortedUpload;
		expect(uploadAborted).toBe(true);
		expect(submitAfterAbort).toBe(0);
		expect(isCommandInterrupted(abortOutcome)).toBe(true);
		registry.dispose();
	});

	test("fails on non-OK upload responses and recovers cleanly on retry", async () => {
		const registry = AtomRegistry.make();
		const sectionId = "section-2" as Id<"sections">;
		const storageId = "storage-2" as Id<"_storage">;
		const file = new File(["Hallo"], "retry.txt", { type: "text/plain" });
		let attempts = 0;

		const run = () =>
			runCommandEffect(
				scheduleTextFileSubmission(
					registry,
					"file-lane",
					{ visitorId: "v-1", file },
					{
						generateUploadUrl: async () =>
							"https://upload.example.test/retry",
						uploadFile: async () => {
							attempts++;
							if (attempts === 1) {
								return new Response("server error", {
									status: 500,
								});
							}
							return new Response(JSON.stringify({ storageId }), {
								status: 200,
							});
						},
						submitTextFile: async () => ({
							status: "Accepted" as const,
							sectionId,
							title: "retry",
						}),
					},
				),
			);

		const failed = await run();
		expect(AsyncResult.isFailure(failed)).toBe(true);
		if (AsyncResult.isFailure(failed)) {
			const cause = squashCommandFailure(failed);
			expect(cause).toBeInstanceOf(Error);
			expect((cause as Error).message).toBe(
				"The file couldn't be uploaded. Try again.",
			);
		}

		const recovered = await run();
		expect(AsyncResult.isSuccess(recovered)).toBe(true);
		if (AsyncResult.isSuccess(recovered)) {
			expect(recovered.value).toEqual({
				status: "Accepted",
				sectionId,
				title: "retry",
			});
		}
		registry.dispose();
	});
});
