import type {
	ParsingIssue,
	ValidationOperation,
	ValidationOperations,
} from "common-utils";
import { encodedDumgenValidationArtifacts } from "../generated/validation-artifacts.js";
import {
	finalizeKnowledgeGenerationResult,
	grammaticalInputIssues,
	grammaticalInteractionIssues,
	hasEnglishTranslationSelection,
	hasSemanticRelationSelection,
	isGermanKnowledgeReading,
	isGermanRelationTarget,
	isValidWhitespaceSegment,
	knowledgeGenerationResultIssues,
	lemmaCatalogMissRouteMatches,
	normalizeReadingLemma,
	readingKnowledgeCatalogMissRouteMatches,
	shallowFreeze,
} from "../validation-semantics.js";

type RequiredOperation =
	(typeof encodedDumgenValidationArtifacts.requiredOperations)[number];
type RequiredSemanticOperation = Exclude<
	RequiredOperation,
	`dumgen.readonly.${string}`
>;

type DumgenOperationSignature = Readonly<{
	errorMessage?: string;
	version: 1;
}>;

export function assertDumgenOperationSignature(
	name: string,
	signature: unknown,
): asserts signature is DumgenOperationSignature {
	if (signature === undefined)
		throw new ReferenceError(
			`Missing Dumgen operation signature: ${name}.`,
		);
	if (
		signature === null ||
		typeof signature !== "object" ||
		!("version" in signature) ||
		signature.version !== 1 ||
		("errorMessage" in signature &&
			typeof signature.errorMessage !== "string") ||
		"discriminator" in signature
	) {
		throw new TypeError(`Invalid Dumgen operation signature: ${name}.`);
	}
}

function operationMessage(name: RequiredOperation): string {
	const signature =
		encodedDumgenValidationArtifacts.operationSignatures[name];
	assertDumgenOperationSignature(name, signature);
	return signature.errorMessage ?? "Invalid input";
}

function customCheck(
	name: RequiredOperation,
	predicate: (value: never) => boolean,
	path: ParsingIssue["path"] = [],
): ValidationOperation {
	return (value) => ({
		issues: predicate(value as never)
			? []
			: [
					{
						code: "custom",
						message: operationMessage(name),
						path,
					} satisfies ParsingIssue,
				],
		value,
	});
}

const identity: ValidationOperation = (value) => ({ value });
const normalizeNfc: ValidationOperation = (value) => ({
	value: (value as string).normalize("NFC"),
});
const trimString: ValidationOperation = (value) => ({
	value: (value as string).trim(),
});

const MAX_EMOJI_GRAPHEMES = 4;
const standaloneEmojiModifierPattern = /^\p{Emoji_Modifier}$/u;
let singleEmojiPattern: RegExp | undefined;
let graphemeSegmenter: Intl.Segmenter | undefined;

function isCompactEmojiSequence(value: string): boolean {
	singleEmojiPattern ??= new RegExp(
		`^(?:${encodedDumgenValidationArtifacts.emojiRegexSource})$`,
	);
	graphemeSegmenter ??= new Intl.Segmenter(undefined, {
		granularity: "grapheme",
	});
	const graphemes = [...graphemeSegmenter.segment(value)];
	return (
		graphemes.length <= MAX_EMOJI_GRAPHEMES &&
		graphemes.every(
			({ segment }) =>
				singleEmojiPattern?.test(segment) === true &&
				!standaloneEmojiModifierPattern.test(segment),
		)
	);
}

let supportedUnitShadowRoutes: ReadonlySet<string> | undefined;
const supportedUnitShadowRoute: ValidationOperation = (value) => {
	const shadow = value as {
		readonly family: string;
		readonly kind: string;
		readonly language: string;
	};
	const route = `${shadow.language}/${shadow.family}/${shadow.kind}`;
	supportedUnitShadowRoutes ??= new Set(
		encodedDumgenValidationArtifacts.supportedUnitShadowRoutes.split("\n"),
	);
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

export function createDumgenValidationOperations(): ValidationOperations &
	Record<RequiredOperation, ValidationOperation> {
	return new Proxy(
		Object.create(null) as Record<string, ValidationOperation>,
		{
			get(cache, property) {
				if (typeof property !== "string") return undefined;
				const cached = cache[property];
				if (cached !== undefined) return cached;
				const operation = Object.freeze(
					constructDumgenValidationOperation(
						property as RequiredOperation,
					),
				);
				cache[property] = operation;
				return operation;
			},
			defineProperty: () => false,
			deleteProperty: () => false,
			set: () => false,
		},
	) as ValidationOperations & Record<RequiredOperation, ValidationOperation>;
}

export const dumgenValidationOperations = createDumgenValidationOperations();

function constructDumgenValidationOperation(
	name: RequiredOperation,
): ValidationOperation {
	assertDumgenOperationSignature(
		name,
		encodedDumgenValidationArtifacts.operationSignatures[name],
	);
	if (name.startsWith("dumgen.readonly."))
		return (value) => ({ value: shallowFreeze(value) });
	const semanticName = name as RequiredSemanticOperation;
	switch (semanticName) {
		case "dumgen.finalize-knowledge-result":
			return (value) => ({
				value: finalizeKnowledgeGenerationResult(value as never),
			});
		case "dumgen.catalog-miss.lemma-route-correlation":
			return customCheck(name, lemmaCatalogMissRouteMatches as never, [
				"route",
			]);
		case "dumgen.catalog-miss.reading-knowledge-route-correlation":
			return customCheck(
				name,
				readingKnowledgeCatalogMissRouteMatches as never,
				["route"],
			);
		case "dumgen.knowledge-reading.de":
			return customCheck(name, isGermanKnowledgeReading as never, [
				"lemma",
				"language",
			]);
		case "dumgen.knowledge-lemma.de":
			return customCheck(
				name,
				(value: { language: string }) => value.language === "de",
				["language"],
			);
		case "dumgen.relation-target.de":
			return customCheck(name, isGermanRelationTarget as never, [
				"language",
			]);
		case "dumgen.segment.whitespace":
			return customCheck(name, isValidWhitespaceSegment as never, [
				"text",
			]);
		case "dumgen.semantic-relation-request.non-empty":
			return customCheck(name, hasSemanticRelationSelection as never);
		case "dumgen.translation-request.english":
			return customCheck(name, hasEnglishTranslationSelection as never);
		case "dumgen.grammatical-input.clicked-resolvable":
			return (value) => ({
				issues: grammaticalInputIssues(value as never),
				value,
			});
		case "dumgen.grammatical-interaction.membership":
			return (value) => ({
				issues: grammaticalInteractionIssues(value as never),
				value,
			});
		case "dumgen.knowledge-result.base-only":
			return (value) => ({
				issues: knowledgeGenerationResultIssues(value as never),
				value,
			});
		case "dumgen.transitive.unit-shadow.supported-route":
			return supportedUnitShadowRoute;
		case "dumgen.transitive.custom.hasDistinctPair":
			return customCheck(
				name,
				(value: readonly unknown[]) => value[0] !== value[1],
			);
		case "dumgen.transitive.custom.hasGermanVerbInflectionSignal":
			return customCheck(
				name,
				(value: { number: unknown; tense: unknown; voice: unknown }) =>
					value.number !== null ||
					value.tense !== null ||
					value.voice !== null,
			);
		case "dumgen.transitive.custom.hasMarkedInflectionFeature":
		case "dumgen.transitive.custom.hasMarkedSurfaceFeature":
			return customCheck(name, (value: object) =>
				Object.values(value).some((feature) => feature !== null),
			);
		case "dumgen.transitive.custom.isCompactEmojiSequence":
		case "dumgen.transitive.custom.isCompactEmojiSequence.2":
			return customCheck(name, isCompactEmojiSequence as never);
		case "dumgen.transitive.custom.isLexemeUnitShadow":
			return customCheck(
				name,
				(value: { family: string }) => value.family === "Lexeme",
				["family"],
			);
		case "dumgen.transitive.custom.isLexicalUnitShadow":
			return customCheck(
				name,
				(value: { family: string }) =>
					value.family === "Lexeme" || value.family === "Phraseme",
				["family"],
			);
		case "dumgen.transitive.custom.isMorphemeReading":
			return customCheck(
				name,
				(value: { lemma: { family: string } }) =>
					value.lemma.family === "Morpheme",
				["lemma", "family"],
			);
		case "dumgen.transitive.overwrite.dumrelNormalizeNfc":
		case "dumgen.transitive.overwrite.normalizeNfc":
		case "dumgen.transitive.overwrite.normalizeNfc.2":
		case "dumgen.transitive.overwrite.normalizeNfc.3":
			return normalizeNfc;
		case "dumgen.transitive.overwrite.dumrelTrimString":
		case "dumgen.transitive.overwrite.trimString":
		case "dumgen.transitive.overwrite.trimString.2":
			return trimString;
		case "dumgen.transitive.transform.normalizeLemmaCanonicalForm":
		case "dumgen.transitive.transform.normalizeReadingLemma":
		case "dumgen.transitive.transform.normalizeReadingLemma.2":
			return (value) => ({ value: normalizeReadingLemma(value) });
		case "dumgen.bind-knowledge-input.de":
		case "dumgen.bind-knowledge-reading.de":
		case "dumgen.bind-relation-target.de":
		case "dumgen.bind-segmented-sentence-id":
		case "dumgen.transitive.transform.bindLemmaReference":
		case "dumgen.transitive.transform.bindLexemeUnitShadow":
		case "dumgen.transitive.transform.bindLexicalUnitShadow":
		case "dumgen.transitive.transform.bindMorphemeReadingReference":
		case "dumgen.transitive.transform.bindSupportedUnitShadow":
		case "dumgen.transitive.transform.retainAtLeastTwo":
		case "dumgen.transitive.transform.retainNonEmptyArray":
			return identity;
		default: {
			const unsupported: never = semanticName;
			throw new ReferenceError(
				`Missing Dumgen validation operation: ${String(unsupported)}.`,
			);
		}
	}
}
