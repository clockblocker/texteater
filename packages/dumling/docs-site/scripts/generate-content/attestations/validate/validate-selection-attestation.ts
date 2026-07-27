import type {
	AttestationSource,
	SelectionAttestationSource,
} from "../../shared/types";
import { isSelection } from "../entity/guards";
import { parseSelectionSentenceMarkdown } from "../selection/parse-sentence-markdown";

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
	if (selectedText !== source.entity.spelledSelection) {
		throw new Error(
			`${source.sourcePath} sentenceMarkdown selection "${selectedText}" must match spelledSelection "${source.entity.spelledSelection}".`,
		);
	}
}
