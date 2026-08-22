import type {
	Constraint,
	ParsingIssue,
	ValidationOperation,
	ValidationOperations,
} from "common-utils";
import { ParsingError } from "common-utils";
import emojiRegex from "emoji-regex";
import { encodedDumdictValidationArtifacts } from "../generated/validation-artifacts.js";
import { dumdictNamedValidationPredicates } from "../validation-semantics.js";
import { COMPACT_EMOJI_PATTERN_TOKEN } from "./compact-validation-payload.js";

type RequiredOperation =
	(typeof encodedDumdictValidationArtifacts.requiredOperations)[number];
type RequiredSemanticOperation = Exclude<
	RequiredOperation,
	`dumdict.discriminator.${string}`
>;
type DumdictOperationSignature = Readonly<{
	discriminator?: Readonly<{
		branches: readonly Constraint[];
		key: string;
		options: readonly string[];
	}>;
	errorMessage?: string;
	version: 1;
}>;

export type DumdictDiscriminatorBranchParser = (
	branch: Constraint,
	value: unknown,
) => unknown | ParsingError;

let configuredDiscriminatorBranchParser:
	| DumdictDiscriminatorBranchParser
	| undefined;

export function configureDumdictDiscriminatorBranchParser(
	parser: DumdictDiscriminatorBranchParser,
): void {
	if (
		configuredDiscriminatorBranchParser !== undefined &&
		configuredDiscriminatorBranchParser !== parser
	)
		throw new TypeError(
			"Dumdict discriminator branch parser is already configured.",
		);
	configuredDiscriminatorBranchParser = parser;
}

function operationMessage(name: RequiredOperation): string {
	const signature =
		encodedDumdictValidationArtifacts.operationSignatures[name];
	return "errorMessage" in signature
		? signature.errorMessage
		: "Invalid input";
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

const normalizeNfc: ValidationOperation = (value) => ({
	value: (value as string).normalize("NFC"),
});
const trimString: ValidationOperation = (value) => ({
	value: (value as string).trim(),
});
const identity: ValidationOperation = (value) => ({ value });

const normalizeReadingLemma: ValidationOperation = (value) => {
	if (value === null || typeof value !== "object") return { value };
	const canonicalForm = Reflect.get(value, "canonicalForm");
	return {
		value:
			typeof canonicalForm === "string"
				? {
						...value,
						canonicalForm: canonicalForm.trim().normalize("NFC"),
					}
				: value,
	};
};

const MAX_EMOJI_GRAPHEMES = 4;
const standaloneEmojiModifierPattern = /^\p{Emoji_Modifier}$/u;
let singleEmojiPattern: RegExp | undefined;
let graphemeSegmenter: Intl.Segmenter | undefined;

export function resolveDumdictExternalConstraintString(token: string): string {
	if (token !== COMPACT_EMOJI_PATTERN_TOKEN)
		throw new ReferenceError(
			`Unknown Dumdict external-string token: ${token}.`,
		);
	return `^(?:${emojiRegex().source}){1,${MAX_EMOJI_GRAPHEMES}}$`;
}
function isCompactEmojiSequence(value: string): boolean {
	singleEmojiPattern ??= new RegExp(`^(?:${emojiRegex().source})$`);
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
	if (supportedUnitShadowRoutes === undefined)
		supportedUnitShadowRoutes = new Set(
			encodedDumdictValidationArtifacts.supportedUnitShadowRoutes.split(
				"\n",
			),
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

function localCheck(name: keyof typeof dumdictNamedValidationPredicates) {
	return customCheck(
		name,
		dumdictNamedValidationPredicates[name] as (value: never) => boolean,
	);
}

export function createDumdictValidationOperations(
	branchParser?: DumdictDiscriminatorBranchParser,
): ValidationOperations & Record<RequiredOperation, ValidationOperation> {
	return new Proxy(
		Object.create(null) as Record<string, ValidationOperation>,
		{
			get(cache, property) {
				if (typeof property !== "string") return undefined;
				const cached = cache[property];
				if (cached !== undefined) return cached;
				const operation = Object.freeze(
					constructDumdictValidationOperation(
						property as RequiredOperation,
						branchParser,
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

export const dumdictValidationOperations = createDumdictValidationOperations();

export function assertDumdictOperationSignature(
	name: string,
	signature: unknown,
): asserts signature is DumdictOperationSignature {
	if (signature === undefined)
		throw new ReferenceError(
			`Missing Dumdict operation signature: ${name}.`,
		);
	if (signature === null || typeof signature !== "object")
		throw new TypeError(`Invalid Dumdict operation signature: ${name}.`);
	const version = Reflect.get(signature, "version");
	if (version !== 1)
		throw new TypeError(
			`Unsupported Dumdict operation signature version for ${name}: ${String(version)}.`,
		);
	const errorMessage = Reflect.get(signature, "errorMessage");
	if (errorMessage !== undefined && typeof errorMessage !== "string")
		throw new TypeError(`Invalid Dumdict operation signature: ${name}.`);
	const discriminator = Reflect.get(signature, "discriminator");
	if (discriminator === undefined) return;
	if (
		errorMessage !== undefined ||
		discriminator === null ||
		typeof discriminator !== "object"
	)
		throw new TypeError(`Invalid Dumdict operation signature: ${name}.`);
	const key = Reflect.get(discriminator, "key");
	const options = Reflect.get(discriminator, "options");
	const branches = Reflect.get(discriminator, "branches");
	if (
		typeof key !== "string" ||
		key.length === 0 ||
		!Array.isArray(options) ||
		options.length === 0 ||
		!Array.isArray(branches) ||
		branches.length !== options.length ||
		branches.some((branch) => !Array.isArray(branch)) ||
		options.some((option) => typeof option !== "string") ||
		new Set(options).size !== options.length
	)
		throw new TypeError(`Invalid Dumdict operation signature: ${name}.`);
}

function discriminatorOperation(
	name: string,
	signature: NonNullable<DumdictOperationSignature["discriminator"]>,
	branchParser?: DumdictDiscriminatorBranchParser,
): ValidationOperation {
	const { key } = signature;
	const options = Object.freeze([...signature.options]);
	const optionIndexes = new Map(
		options.map((option, index) => [option, index] as const),
	);
	const activeValues = new WeakSet<object>();
	return (value) => {
		if (
			value === null ||
			typeof value !== "object" ||
			Array.isArray(value)
		) {
			const received =
				value === null
					? "null"
					: Array.isArray(value)
						? "array"
						: typeof value;
			return {
				issues: [
					{
						code: "invalid_type",
						expected: "object",
						message: `Invalid input: expected object, received ${received}`,
						path: [],
					} satisfies ParsingIssue,
				],
				value,
			};
		}
		const selected = Reflect.get(value, key);
		const selectedIndex =
			typeof selected === "string"
				? optionIndexes.get(selected)
				: undefined;
		if (selectedIndex !== undefined) {
			if (activeValues.has(value))
				throw new RangeError(
					`Recursive Dumdict discriminator selection: ${name}.`,
				);
			const parseBranch =
				branchParser ?? configuredDiscriminatorBranchParser;
			if (parseBranch === undefined)
				throw new ReferenceError(
					"Dumdict discriminator branch parser is not configured.",
				);
			activeValues.add(value);
			try {
				const parsed = parseBranch(
					signature.branches[selectedIndex] as Constraint,
					value,
				);
				return parsed instanceof ParsingError
					? { issues: parsed.issues, value }
					: { value: parsed };
			} finally {
				activeValues.delete(value);
			}
		}
		return {
			issues: [
				{
					code: "invalid_union",
					discriminator: key,
					errors: [],
					message: `Invalid discriminator value. Expected ${options
						.map((option) => `'${option}'`)
						.join(" | ")}`,
					note: "No matching discriminator",
					options: [...options],
					path: [key],
				} satisfies ParsingIssue,
			],
			value,
		};
	};
}

function constructDumdictValidationOperation(
	name: RequiredOperation,
	branchParser?: DumdictDiscriminatorBranchParser,
): ValidationOperation {
	const signature =
		encodedDumdictValidationArtifacts.operationSignatures[name];
	assertDumdictOperationSignature(name, signature);
	if (signature.discriminator !== undefined)
		return discriminatorOperation(
			name,
			signature.discriminator,
			branchParser,
		);
	const semanticName = name as RequiredSemanticOperation;
	switch (semanticName) {
		case "dumdict.knowledge-change.language.de":
		case "dumdict.knowledge-change.language.en":
		case "dumdict.knowledge-change.language.he":
		case "dumdict.knowledge-change.reading-matches-patched":
		case "dumdict.pending.locator-matches-relation":
		case "dumdict.pending.locator-source":
		case "dumdict.pending.target-language.de":
		case "dumdict.pending.target-language.en":
		case "dumdict.pending.target-language.he":
		case "dumdict.reading-entry.no-same-lemma":
		case "dumdict.reading-knowledge.language.de":
		case "dumdict.reading-knowledge.language.en":
		case "dumdict.reading-knowledge.language.he":
		case "dumdict.reading.language.de":
		case "dumdict.reading.language.en":
		case "dumdict.reading.language.he":
		case "dumdict.surface.id-matches":
		case "dumdict.surface.owner-matches":
			return localCheck(semanticName);
		case "dumdict.pending-entry-id.he":
		case "dumdict.retain-commit-request":
		case "dumdict.retain-plan":
		case "dumdict.transitive.transform.bindLemmaReference":
		case "dumdict.transitive.transform.bindLexemeUnitShadow":
		case "dumdict.transitive.transform.bindLexicalUnitShadow":
		case "dumdict.transitive.transform.bindMorphemeReadingReference":
		case "dumdict.transitive.transform.bindSupportedUnitShadow":
		case "dumdict.transitive.transform.retainAtLeastTwo":
		case "dumdict.transitive.transform.retainNonEmptyArray":
			return identity;
		case "dumdict.transitive.contextual.anonymous":
			return supportedUnitShadowRoute;
		case "dumdict.transitive.custom.hasDistinctPair":
			return customCheck(
				name,
				(value: readonly unknown[]) => value[0] !== value[1],
			);
		case "dumdict.transitive.custom.hasGermanVerbInflectionSignal":
			return customCheck(
				name,
				(value: { number: unknown; tense: unknown; voice: unknown }) =>
					value.number !== null ||
					value.tense !== null ||
					value.voice !== null,
			);
		case "dumdict.transitive.custom.hasMarkedInflectionFeature":
		case "dumdict.transitive.custom.hasMarkedSurfaceFeature":
			return customCheck(name, (value: object) =>
				Object.values(value).some((feature) => feature !== null),
			);
		case "dumdict.transitive.custom.isCompactEmojiSequence":
		case "dumdict.transitive.custom.isCompactEmojiSequence.2":
			return customCheck(name, isCompactEmojiSequence);
		case "dumdict.transitive.custom.isLexemeUnitShadow":
			return customCheck(
				name,
				(value: { family: string }) => value.family === "Lexeme",
				["family"],
			);
		case "dumdict.transitive.custom.isLexicalUnitShadow":
			return customCheck(
				name,
				(value: { family: string }) =>
					value.family === "Lexeme" || value.family === "Phraseme",
				["family"],
			);
		case "dumdict.transitive.custom.isMorphemeReading":
			return customCheck(
				name,
				(value: { lemma: { family: string } }) =>
					value.lemma.family === "Morpheme",
				["lemma", "family"],
			);
		case "dumdict.transitive.overwrite.dumrelNormalizeNfc":
		case "dumdict.transitive.overwrite.normalizeNfc":
		case "dumdict.transitive.overwrite.normalizeNfc.2":
		case "dumdict.transitive.overwrite.normalizeNfc.3":
			return normalizeNfc;
		case "dumdict.transitive.overwrite.dumrelTrimString":
		case "dumdict.transitive.overwrite.trimString":
		case "dumdict.transitive.overwrite.trimString.2":
			return trimString;
		case "dumdict.transitive.transform.normalizeLemmaCanonicalForm":
		case "dumdict.transitive.transform.normalizeReadingLemma":
		case "dumdict.transitive.transform.normalizeReadingLemma.2":
			return normalizeReadingLemma;
		default: {
			const unsupported: never = semanticName;
			throw new ReferenceError(
				`Missing Dumdict validation operation: ${String(unsupported)}.`,
			);
		}
	}
}
