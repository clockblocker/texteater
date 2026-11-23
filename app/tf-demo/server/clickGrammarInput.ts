import { isSupportedTargetLanguage } from "../shared/supported-target-language";
import type {
	ClickGrammarInput,
	ClickGrammarSentence,
} from "./clickResolution";
import type {
	PersistedSentence,
	ResolutionContext,
} from "./orchestrationPorts";
import {
	assertStoredSentence,
	encounterSentenceOf,
	unitsByMember,
} from "./storedSegments";

/** A stored German Sentence as Grammar reads it. */
export function clickSentenceOf(
	stored: PersistedSentence,
): ClickGrammarSentence {
	if (!isSupportedTargetLanguage(stored.language)) {
		throw new Error("Only German click resolution is enabled in tf-demo.");
	}
	assertStoredSentence(stored);
	return encounterSentenceOf(stored);
}

/**
 * What Grammar takes for a click at `clickedSegmentIndex`, from the
 * click's Resolution Context: the click's own, and the one a batch asks
 * ahead of it builds the same way (#1351).
 */
export function clickGrammarInputOf(
	context: ResolutionContext,
	clickedSegmentIndex: number,
): ClickGrammarInput {
	const stored = context.sentence;
	if (!stored) throw new Error("The requested sentence does not exist.");
	const unit = unitsByMember(stored.units).get(clickedSegmentIndex);
	return {
		sentence: clickSentenceOf(stored),
		clickedSegmentIndex,
		...(unit ? { unit } : {}),
		units: stored.units ?? [],
		lemmaCandidates: context.lemmaCandidates,
		neighbours: context.neighbours ?? {},
	};
}
