import { useAction, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useState } from "react";
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

/**
 * Submits a `.txt` file (#1191): it goes to Convex File Storage through an
 * upload URL, then intake reads it into a Section of Scrolls. A file over
 * the size limit is turned away before it is uploaded.
 */
export function useTextFileSubmission(visitorId: string) {
	const generateUploadUrl = useMutation(api.textFiles.generateUploadUrl);
	const submitTextFile = useAction(api.textFileIntake.submitTextFile);
	const [isPending, setIsPending] = useState(false);
	const run = useCallback(
		async (file: File): Promise<TextFileResult> => {
			if (file.size > MAX_TEXT_FILE_BYTES)
				return {
					status: "Rejected",
					message: TEXT_FILE_TOO_LARGE_MESSAGE,
				};
			setIsPending(true);
			try {
				const uploadUrl = await generateUploadUrl({ visitorId });
				const response = await fetch(uploadUrl, {
					method: "POST",
					headers: { "Content-Type": file.type || "text/plain" },
					body: file,
				});
				if (!response.ok) throw new Error(UPLOAD_FAILED_MESSAGE);
				const { storageId } = (await response.json()) as {
					storageId: Id<"_storage">;
				};
				return await submitTextFile({
					visitorId,
					storageId,
					fileName: file.name,
				});
			} finally {
				setIsPending(false);
			}
		},
		[generateUploadUrl, submitTextFile, visitorId],
	);
	return { run, isPending } as const;
}
