import type { Segment, SegmentKind } from "../types";
import {
	assertStitchedText,
	freezeSegmentation,
	pushSegment,
	type SourceSegmentation,
	type SourceSegmentationTraceEntry,
} from "./contracts";

const graphemes = new Intl.Segmenter("de", { granularity: "grapheme" });
const abbreviation = /^(?:[\p{L}]\.){2,}|^[\p{L}]\.(?: [\p{L}]\.)+/u;
const commonAbbreviation = /^(?:Abb|bzw|ca|Dr|Nr|Prof|usw)\./iu;
const contraction = /^([\p{L}\p{M}]{2,})([’'])([ms])(?=$|[^\p{L}\p{M}])/iu;
const internalApostrophe = /^[\p{L}\p{M}]+[’'][\p{L}\p{M}]+/u;
const trailingApostrophe = /^[\p{L}\p{M}]+[’']/u;
const word = /^[\p{L}\p{M}\p{N}]+(?:[-‐‑][\p{L}\p{M}\p{N}]+)*[-‐‑]?/u;
const alphaNumeric = /^[\p{L}\p{M}\p{N}]+/u;
const identifierOrPath =
	/^[\p{L}\p{M}\p{N}.]+(?:[_/\\][\p{L}\p{M}\p{N}._-]+)+/u;
const social = /^([#@])([\p{L}\p{M}\p{N}_-]+)/u;
const url = /^(?:https?:\/\/|www\.)[^\s]+/iu;
const email = /^[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/iu;
const percentage = /^\d+(?:[,.]\d+)?%/u;
const date = /^\d{1,2}\.\d{1,2}\.\d{4}/u;
const decimal = /^\d+(?:[,.]\d+)+/u;
const number = /^\d+/u;
const emoticon = /^(?::[-^]?[)(]|;[-^]?\))/u;
const punctuationRun = /^(?:[?!]+|\.{3}|…+)/u;

/**
 * Deterministic German source segmentation.
 *
 * Latin word-like spans are intentionally optimistic ResolvableText. This is
 * learner-friendly for slang and code-switching (for example, `braw u r him
 * frfr`), but a mixed-language Latin span may reach Click Resolution and be
 * rejected there. Source Segmentation does not attempt lexical language ID.
 */
export function segmentGerman(stitchedText: string): SourceSegmentation {
	assertStitchedText(stitchedText);
	const segments: Segment[] = [];
	const trace: SourceSegmentationTraceEntry[] = [];
	let offset = 0;

	while (offset < stitchedText.length) {
		const rest = stitchedText.slice(offset);
		if (rest.startsWith(" ")) {
			pushSegment(segments, trace, "Whitespace", " ", "space-separator");
			offset += 1;
			continue;
		}

		const urlValue = rest.match(url)?.[0];
		if (urlValue) {
			const { body, trailing } = detachTrailingPunctuation(urlValue);
			pushSegment(segments, trace, "OpaqueText", body, "url-entity");
			pushSegment(
				segments,
				trace,
				"Punctuation",
				trailing,
				"url-trailing-punctuation",
			);
			offset += urlValue.length;
			continue;
		}

		const emailValue = rest.match(email)?.[0];
		if (emailValue) {
			pushSegment(
				segments,
				trace,
				"OpaqueText",
				emailValue,
				"email-entity",
			);
			offset += emailValue.length;
			continue;
		}

		const socialValue = rest.match(social);
		if (socialValue) {
			const [whole, sigil, payload] = socialValue;
			pushSegment(
				segments,
				trace,
				"Punctuation",
				sigil ?? "",
				"social-sigil",
			);
			pushSegment(
				segments,
				trace,
				"OpaqueText",
				payload ?? "",
				"social-payload",
			);
			offset += whole.length;
			continue;
		}

		const identifier = rest.match(identifierOrPath)?.[0];
		if (identifier) {
			const { body, trailing } = detachTrailingPunctuation(identifier);
			pushSegment(
				segments,
				trace,
				"OpaqueText",
				body,
				"identifier-or-path",
			);
			pushSegment(
				segments,
				trace,
				"Punctuation",
				trailing,
				"identifier-trailing-punctuation",
			);
			offset += identifier.length;
			continue;
		}

		const alphaNumericValue = rest.match(alphaNumeric)?.[0];
		if (alphaNumericValue && isMixedOrNonLatin(alphaNumericValue)) {
			pushSegment(
				segments,
				trace,
				"OpaqueText",
				alphaNumericValue,
				"mixed-or-non-latin-run",
			);
			offset += alphaNumericValue.length;
			continue;
		}

		const abbreviationValue =
			rest.match(abbreviation)?.[0] ??
			rest.match(commonAbbreviation)?.[0];
		if (abbreviationValue) {
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				abbreviationValue,
				"recognized-abbreviation",
			);
			offset += abbreviationValue.length;
			continue;
		}

		const contractionValue = rest.match(contraction);
		if (contractionValue) {
			const [whole, host, apostrophe, suffix] = contractionValue;
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				host ?? "",
				"apostrophe-host",
			);
			pushSegment(
				segments,
				trace,
				"Punctuation",
				apostrophe ?? "",
				"apostrophe-seam",
			);
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				suffix ?? "",
				"apostrophe-exponent",
			);
			offset += whole.length;
			continue;
		}

		const lexicalApostrophe = rest.match(internalApostrophe)?.[0];
		if (lexicalApostrophe) {
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				lexicalApostrophe,
				"lexical-internal-apostrophe",
			);
			offset += lexicalApostrophe.length;
			continue;
		}

		const possessiveApostrophe = rest.match(trailingApostrophe)?.[0];
		if (possessiveApostrophe) {
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				possessiveApostrophe,
				"possessive-trailing-apostrophe",
			);
			offset += possessiveApostrophe.length;
			continue;
		}

		const percentageValue = rest.match(percentage)?.[0];
		if (percentageValue) {
			pushSegment(
				segments,
				trace,
				"OpaqueText",
				percentageValue,
				"percentage-fallback",
			);
			offset += percentageValue.length;
			continue;
		}

		const numeric =
			rest.match(date)?.[0] ??
			rest.match(decimal)?.[0] ??
			rest.match(number)?.[0];
		if (numeric) {
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				numeric,
				"supported-number",
			);
			offset += numeric.length;
			continue;
		}

		const emoticonValue = rest.match(emoticon)?.[0];
		if (emoticonValue) {
			pushSegment(
				segments,
				trace,
				"OpaqueText",
				emoticonValue,
				"emoticon",
			);
			offset += emoticonValue.length;
			continue;
		}

		const emoji = takeEmojiRun(rest);
		if (emoji) {
			pushSegment(segments, trace, "OpaqueText", emoji, "emoji-run");
			offset += emoji.length;
			continue;
		}

		const wordValue = rest.match(word)?.[0];
		if (wordValue) {
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				wordValue,
				"german-surface-candidate",
			);
			offset += wordValue.length;
			continue;
		}

		if (/^[€$£¥]/u.test(rest)) {
			const currency = firstGrapheme(rest);
			pushSegment(
				segments,
				trace,
				"ResolvableText",
				currency,
				"currency-unit",
			);
			offset += currency.length;
			continue;
		}

		const punctuation = rest.match(punctuationRun)?.[0];
		if (punctuation) {
			pushSegment(
				segments,
				trace,
				"Punctuation",
				punctuation,
				"conventional-punctuation-run",
			);
			offset += punctuation.length;
			continue;
		}

		const grapheme = firstGrapheme(rest);
		const kind: SegmentKind = /^\p{P}/u.test(grapheme)
			? "Punctuation"
			: "OpaqueText";
		pushSegment(
			segments,
			trace,
			kind,
			grapheme,
			kind === "Punctuation" ? "punctuation" : "unknown-symbol",
		);
		offset += grapheme.length;
	}

	return freezeSegmentation(stitchedText, segments, trace);
}

function detachTrailingPunctuation(value: string): {
	readonly body: string;
	readonly trailing: string;
} {
	const match = value.match(/[.,!?;:…]+$/u);
	if (!match || match.index === 0) return { body: value, trailing: "" };
	return { body: value.slice(0, match.index), trailing: match[0] };
}

function isMixedOrNonLatin(value: string): boolean {
	const hasLatin = /\p{Script=Latin}/u.test(value);
	const hasOtherLetter = /\p{L}/u.test(
		value.replace(/[\p{Script=Latin}\p{M}\p{N}]/gu, ""),
	);
	return hasOtherLetter || (!hasLatin && /\p{L}/u.test(value));
}

function takeEmojiRun(value: string): string {
	let run = "";
	for (const part of graphemes.segment(value)) {
		if (
			!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(
				part.segment,
			)
		) {
			break;
		}
		run += part.segment;
	}
	return run;
}

function firstGrapheme(value: string): string {
	const first = graphemes.segment(value)[Symbol.iterator]().next().value;
	if (!first) throw new Error("Expected a grapheme in non-empty text.");
	return first.segment;
}
