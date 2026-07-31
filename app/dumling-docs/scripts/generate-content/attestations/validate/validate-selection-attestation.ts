import type {
	AttestationSource,
	SelectionAttestationSource,
} from "../../shared/types";
import { isSelection } from "../entity/guards";
import { parseSelectionSentenceMarkdown } from "../selection/parse-sentence-markdown";

function indexedSegments(sentenceMarkdown: string): Array<{
	kind: "Text" | "Whitespace" | "Punctuation";
	text: string;
}> {
	const open = sentenceMarkdown.indexOf("[");
	const close = sentenceMarkdown.indexOf("]", open + 1);
	const sentenceText =
		sentenceMarkdown.slice(0, open) +
		sentenceMarkdown.slice(open + 1, close) +
		sentenceMarkdown.slice(close + 1);
	const selectedStart = open;
	const selectedEnd = open + close - open - 1;
	const boundaries = new Set([
		0,
		selectedStart,
		selectedEnd,
		sentenceText.length,
	]);
	let offset = 0;
	let previousKind: "Text" | "Whitespace" | "Punctuation" | undefined;
	for (const character of sentenceText) {
		const kind = /\s/u.test(character)
			? "Whitespace"
			: offset >= selectedStart && offset < selectedEnd
				? "Text"
				: /[\p{L}\p{M}\p{N}]/u.test(character)
					? "Text"
					: "Punctuation";
		if (previousKind !== undefined && previousKind !== kind) {
			boundaries.add(offset);
		}
		offset += character.length;
		previousKind = kind;
	}
	const ordered = [...boundaries].sort((left, right) => left - right);
	return ordered.slice(0, -1).map((start, index) => {
		const text = sentenceText.slice(start, ordered[index + 1]);
		const kind = /\s/u.test(text[0] ?? "")
			? "Whitespace"
			: start >= selectedStart && start < selectedEnd
				? "Text"
				: /[\p{L}\p{M}\p{N}]/u.test(text[0] ?? "")
					? "Text"
					: "Punctuation";
		return { kind, text };
	});
}

export function isSelectionAttestationSource(
	source: AttestationSource,
): source is AttestationSource & SelectionAttestationSource {
	return isSelection(source.entity);
}

export function validateSelectionAttestation(
	source: AttestationSource,
): asserts source is AttestationSource & SelectionAttestationSource {
	if (!isSelectionAttestationSource(source)) {
		return;
	}

	if (source.order !== undefined) {
		throw new Error(
			`${source.sourcePath} selection attestations must not define order.`,
		);
	}
	if (source.sentenceMarkdown === undefined) {
		throw new Error(
			`${source.sourcePath} selection attestations must define sentenceMarkdown.`,
		);
	}

	const { selectedText } = parseSelectionSentenceMarkdown(
		source.sentenceMarkdown,
		source.sourcePath,
	);
	const segments = indexedSegments(source.sentenceMarkdown);
	const clickedSegment = segments[source.entity.clickedSegmentIndex];
	if (
		clickedSegment?.kind !== "Text" ||
		!selectedText.includes(clickedSegment.text)
	) {
		throw new Error(
			`${source.sourcePath} clickedSegmentIndex ${source.entity.clickedSegmentIndex} must address Text inside sentenceMarkdown selection "${selectedText}".`,
		);
	}
	if (
		!source.entity.surfaceSegmentIndices.includes(
			source.entity.clickedSegmentIndex,
		)
	) {
		throw new Error(
			`${source.sourcePath} surfaceSegmentIndices must include clickedSegmentIndex.`,
		);
	}
}
