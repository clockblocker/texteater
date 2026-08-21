import type {
	ParsingIssue,
	ValidationOperation,
	ValidationOperations,
} from "common-utils";
import { encodedDumrelValidationArtifacts } from "../generated/validation-artifacts.js";
import type { SemanticRelationGraph, UnitShadow } from "../types.js";
import {
	bindLemmaReference,
	bindLexemeUnitShadow,
	bindLexicalUnitShadow,
	bindMorphemeReadingReference,
	bindSupportedUnitShadow,
	dumrelNormalizeNfc,
	dumrelTrimString,
	hasSemanticRelationSelection,
	hasTranslationSelection,
	isCompactEmojiSequence,
	isLexemeUnitShadow,
	isLexicalUnitShadow,
	isMorphemeReading,
	normalizeLemmaCanonicalForm,
	normalizeReadingLemma,
	retainAtLeastTwo,
	retainNonEmptyArray,
	semanticRelationGraphIssues,
} from "../validation-semantics.js";

function customCheck(
	predicate: (value: never) => boolean,
	message: string,
	path: ParsingIssue["path"] = [],
): ValidationOperation {
	return (value) => ({
		issues: predicate(value as never)
			? []
			: [
					{
						code: "custom",
						message,
						path,
					} satisfies ParsingIssue,
				],
		value,
	});
}

const supportedUnitShadowRoutes = new Set(
	encodedDumrelValidationArtifacts.supportedUnitShadowRoutes.split("\n"),
);

const supportedUnitShadowRoute: ValidationOperation = (value) => {
	const shadow = value as UnitShadow;
	const route = `${shadow.language}/${shadow.family}/${shadow.kind}`;
	return {
		issues: supportedUnitShadowRoutes.has(route)
			? []
			: [
					{
						code: "custom",
						message: `${route} is not a supported Dumling Lemma route.`,
						path: ["kind"],
					} satisfies ParsingIssue,
				],
		value,
	};
};

const semanticRelationGraphIntegrity: ValidationOperation = (value) => ({
	issues: semanticRelationGraphIssues(value as SemanticRelationGraph),
	value,
});

export const dumrelValidationOperations = {
	"dumrel.bind-lemma-reference": (value) => ({
		value: bindLemmaReference(value),
	}),
	"dumrel.bind-lexeme-unit-shadow": (value) => ({
		value: bindLexemeUnitShadow(value as never),
	}),
	"dumrel.bind-lexical-unit-shadow": (value) => ({
		value: bindLexicalUnitShadow(value as never),
	}),
	"dumrel.bind-morpheme-reading-reference": (value) => ({
		value: bindMorphemeReadingReference(value as never),
	}),
	"dumrel.bind-supported-unit-shadow": (value) => ({
		value: bindSupportedUnitShadow(value as never),
	}),
	"dumrel.lexeme-unit-shadow": customCheck(
		isLexemeUnitShadow,
		"A Lexeme Unit Shadow must use the Lexeme Family.",
		["family"],
	),
	"dumrel.lexical-unit-shadow": customCheck(
		isLexicalUnitShadow,
		"A lexical Unit Shadow must be a Lexeme or Phraseme.",
		["family"],
	),
	"dumrel.morpheme-reading": customCheck(
		isMorphemeReading,
		"A Morpheme Reading must use the Morpheme Family.",
		["lemma", "family"],
	),
	"dumrel.normalize-lemma-canonical-form": (value) => ({
		value: normalizeLemmaCanonicalForm(value),
	}),
	"dumrel.normalize-nfc": (value) => ({
		value: dumrelNormalizeNfc(value as string),
	}),
	"dumrel.reading.compact-emoji-sequence": customCheck(
		isCompactEmojiSequence,
		"Invalid input",
	),
	"dumrel.reading.normalize-lemma": (value) => ({
		value: normalizeReadingLemma(value),
	}),
	"dumrel.reading.normalize-nfc": (value) => ({
		value: dumrelNormalizeNfc(value as string),
	}),
	"dumrel.reading.trim-string": (value) => ({
		value: dumrelTrimString(value as string),
	}),
	"dumrel.retain-at-least-two": (value) => ({
		value: retainAtLeastTwo(value as unknown[]),
	}),
	"dumrel.retain-non-empty-array": (value) => ({
		value: retainNonEmptyArray(value as unknown[]),
	}),
	"dumrel.semantic-relation-graph.integrity": semanticRelationGraphIntegrity,
	"dumrel.semantic-relation-request.non-empty": customCheck(
		hasSemanticRelationSelection,
		"A Semantic Relation request must select at least one relation.",
	),
	"dumrel.translation-request.non-empty": customCheck(
		hasTranslationSelection,
		"A Translation request must select at least one language.",
	),
	"dumrel.trim-string": (value) => ({
		value: dumrelTrimString(value as string),
	}),
	"dumrel.unit-shadow.supported-route": supportedUnitShadowRoute,
} as const satisfies ValidationOperations;
