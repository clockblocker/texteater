import { RegistryContext } from "@effect/atom-react";
import { useAction, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import {
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import {
	createCommandScheduler,
	runCommandEffect,
	squashCommandFailure,
	tryCommandPromise,
} from "@/lib/command-scheduler";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	MAX_TEXT_FILE_BYTES,
	TEXT_FILE_TOO_LARGE_MESSAGE,
} from "../../shared/text-file-limits";

type TextFileResult = FunctionReturnType<
	typeof api.textFileIntake.submitTextFile
>;

const UPLOAD_FAILED_MESSAGE = "The file couldn't be uploaded. Try again.";

class TextFileUploadError extends Data.TaggedError("TextFileUploadError")<{
	readonly message: string;
}> {}

const textFileSubmissionScheduler = createCommandScheduler();

interface TextFileSubmissionDependencies {
	readonly generateUploadUrl: (args: {
		readonly visitorId: string;
	}) => Promise<string>;
	readonly uploadFile?: (
		uploadUrl: string,
		file: File,
		signal: AbortSignal,
	) => Promise<Response>;
	readonly submitTextFile: (args: {
		readonly visitorId: string;
		readonly storageId: Id<"_storage">;
		readonly fileName: string;
	}) => Promise<TextFileResult>;
}

/**
 * Schedules a `.txt` upload + intake pipeline under `singleFlight` concurrency
 * so duplicate submissions share one upload and fiber interruption aborts an
 * in-flight HTTP upload before `submitTextFile` runs.
 */
export function scheduleTextFileSubmission(
	registry: AtomRegistry.AtomRegistry,
	laneKey: string,
	request: {
		readonly visitorId: string;
		readonly file: File;
	},
	deps: TextFileSubmissionDependencies,
) {
	if (request.file.size > MAX_TEXT_FILE_BYTES) {
		return Effect.succeed<TextFileResult>({
			status: "Rejected",
			message: TEXT_FILE_TOO_LARGE_MESSAGE,
		});
	}

	const uploadFile =
		deps.uploadFile ??
		((uploadUrl: string, file: File, signal: AbortSignal) =>
			fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type || "text/plain" },
				body: file,
				signal,
			}));

	return textFileSubmissionScheduler.schedule(
		registry,
		{ mode: "singleFlight", key: () => laneKey },
		request,
		Effect.gen(function* () {
			const uploadUrl = yield* tryCommandPromise(() =>
				deps.generateUploadUrl({ visitorId: request.visitorId }),
			);
			const response = yield* tryCommandPromise((signal) =>
				uploadFile(uploadUrl, request.file, signal),
			);
			if (!response.ok) {
				return yield* new TextFileUploadError({
					message: UPLOAD_FAILED_MESSAGE,
				});
			}
			const { storageId } = yield* tryCommandPromise(
				() =>
					response.json() as Promise<{
						storageId: Id<"_storage">;
					}>,
			);
			return yield* tryCommandPromise(() =>
				deps.submitTextFile({
					visitorId: request.visitorId,
					storageId,
					fileName: request.file.name,
				}),
			);
		}),
	);
}

/**
 * Submits a `.txt` file (#1191): it goes to Convex File Storage through an
 * upload URL, then intake reads it into a Section of Scrolls. A file over
 * the size limit is turned away before it is uploaded.
 */
export function useTextFileSubmission(visitorId: string) {
	const registry = useContext(RegistryContext);
	const laneKey = useId();
	const generateUploadUrl = useMutation(api.textFiles.generateUploadUrl);
	const submitTextFile = useAction(api.textFileIntake.submitTextFile);
	const [pendingCount, setPendingCount] = useState(0);
	const isMountedRef = useRef(true);
	const unmountAbortRef = useRef<AbortController | null>(null);

	// oxlint-disable-next-line textfresser/no-unreasoned-state-sync -- owns the unmount AbortController and mounted flag for in-flight HTTP uploads
	useEffect(() => {
		isMountedRef.current = true;
		const controller = new AbortController();
		unmountAbortRef.current = controller;
		return () => {
			isMountedRef.current = false;
			controller.abort();
			if (unmountAbortRef.current === controller) {
				unmountAbortRef.current = null;
			}
		};
	}, []);

	const run = useCallback(
		async (file: File): Promise<TextFileResult> => {
			if (file.size > MAX_TEXT_FILE_BYTES) {
				return {
					status: "Rejected",
					message: TEXT_FILE_TOO_LARGE_MESSAGE,
				};
			}
			setPendingCount((count) => count + 1);
			try {
				const outcome = await runCommandEffect(
					scheduleTextFileSubmission(
						registry,
						laneKey,
						{ visitorId, file },
						{ generateUploadUrl, submitTextFile },
					),
					{ signal: unmountAbortRef.current?.signal },
				);
				if (AsyncResult.isFailure(outcome)) {
					throw squashCommandFailure(outcome);
				}
				return outcome.value;
			} finally {
				if (isMountedRef.current) {
					setPendingCount((count) => Math.max(0, count - 1));
				}
			}
		},
		[generateUploadUrl, laneKey, registry, submitTextFile, visitorId],
	);
	return { run, isPending: pendingCount > 0 } as const;
}
