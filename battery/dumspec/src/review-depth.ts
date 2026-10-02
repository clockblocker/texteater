import { applyEdits, type FormattingOptions, modify } from "jsonc-parser";
import type { AnnotationLayer } from "./types.js";

const formatting: FormattingOptions = {
	insertSpaces: false,
	tabSize: 4,
	eol: "\n",
};

/**
 * A record file's text with only its `reviewDepth` changed, keeping the
 * file's layout: set to `depth`, or removed for a Draft. A new `reviewDepth`
 * goes where every reviewed record keeps it, right after `coverage`.
 */
export function setReviewDepth(
	text: string,
	depth: AnnotationLayer | undefined,
): string {
	return applyEdits(
		text,
		modify(text, ["reviewDepth"], depth, {
			formattingOptions: formatting,
			getInsertionIndex: (properties) => {
				const coverage = properties.indexOf("coverage");
				return coverage === -1 ? properties.length : coverage + 1;
			},
		}),
	);
}
