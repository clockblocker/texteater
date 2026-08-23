import {
	type Constraint,
	ParsingError,
	type ParsingIssue,
	parseValidationArtifact,
	type ValidationOperation,
	type ValidationOperations,
} from "common-utils";
import { loadEncodedRuntimePromptData } from "../generated/runtime-prompt-artifacts.js";
import { encodedDumgenValidationArtifacts } from "../generated/validation-artifacts.js";
import { dumgenValidationOperations } from "../parsing/validation-operations.js";

export type RuntimePromptSchema<Output = unknown, Input = Output> = Readonly<{
	parse(input: unknown): Output;
	toJSONSchema(options?: unknown): unknown;
	readonly "~input"?: Input;
	readonly "~output"?: Output;
}>;

const definitions = lazyDefinitions();
const operations = createRuntimePromptValidationOperations();
let encodedValidation: EncodedRuntimePromptValidation | undefined;

type EncodedRuntimePromptValidation = Readonly<{
	definitionOffsetPayload: string;
	definitionPayloadBlob: string;
	offsetWidth: number;
	operationBindings: Readonly<
		Record<string, Readonly<{ fingerprint: string; version: number }>>
	>;
	operationSignatures: Readonly<Record<string, RuntimeOperationSignature>>;
	requiredOperations: readonly string[];
	roots: Readonly<Record<string, Constraint>>;
	version: 1;
}>;

export function decodeEncodedRuntimePromptValidation(
	payload: string,
): EncodedRuntimePromptValidation {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (cause) {
		throw new SyntaxError("Corrupt runtime prompt validation payload.", {
			cause,
		});
	}
	if (
		parsed === null ||
		typeof parsed !== "object" ||
		!("roots" in parsed) ||
		!("operationSignatures" in parsed) ||
		!("version" in parsed)
	)
		throw new TypeError("Corrupt runtime prompt validation artifact.");
	if (parsed.version !== 1)
		throw new TypeError(
			`Unsupported runtime prompt validation artifact version: ${String(parsed.version)}.`,
		);
	return Object.freeze(parsed as EncodedRuntimePromptValidation);
}

export function loadEncodedRuntimePromptValidation(): EncodedRuntimePromptValidation {
	if (encodedValidation !== undefined) return encodedValidation;
	encodedValidation = decodeEncodedRuntimePromptValidation(
		loadEncodedRuntimePromptData().validationPayload,
	);
	return encodedValidation;
}

export function runtimePromptValidationOperation(
	name: string,
): ValidationOperation {
	const operation = operations[name];
	if (operation === undefined)
		throw new ReferenceError(`Missing runtime prompt operation: ${name}.`);
	return operation;
}

export function parseRuntimePromptRoot<Output = unknown>(
	rootName: string,
	input: unknown,
): Output {
	return parseRuntimePromptRootWithOperations(rootName, input, operations);
}

export function parseRuntimePromptRootWithOperations<Output = unknown>(
	rootName: string,
	input: unknown,
	validationOperations: ValidationOperations,
): Output {
	const encoded = loadEncodedRuntimePromptValidation();
	const root = encoded.roots[rootName];
	if (root === undefined)
		throw new ReferenceError(
			`Unknown runtime prompt validation root: ${rootName}.`,
		);
	const parsed = parseValidationArtifact<Output>(
		{ definitions, root, version: encoded.version },
		input,
		validationOperations,
	);
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}

export function createRuntimePromptSchema<Output = unknown>(
	rootName: string,
	jsonSchemaPayload: string,
): RuntimePromptSchema<Output> {
	const root = loadEncodedRuntimePromptValidation().roots[rootName];
	if (root === undefined)
		throw new ReferenceError(
			`Unknown runtime prompt validation root: ${rootName}.`,
		);
	let jsonSchema: unknown;
	return Object.freeze({
		parse(input: unknown): Output {
			return parseRuntimePromptRoot<Output>(rootName, input);
		},
		toJSONSchema(): unknown {
			jsonSchema ??= deepFreeze(JSON.parse(jsonSchemaPayload));
			return jsonSchema;
		},
	});
}

export function createRuntimeCombinedKnowledgeModelOutputSchema(
	input: unknown,
	baseSchema: RuntimePromptSchema,
): RuntimePromptSchema {
	const request = (input as { readonly request?: unknown }).request;
	if (
		request === null ||
		typeof request !== "object" ||
		Array.isArray(request)
	)
		throw new TypeError(
			"Combined German Knowledge input requires a request object.",
		);
	const selections = selectedKnowledgeFields(
		request as Readonly<Record<string, unknown>>,
	);
	const baseJson = baseSchema.toJSONSchema() as {
		readonly properties: Readonly<Record<string, unknown>>;
	};
	const properties: Record<string, unknown> = {};
	for (const field of selections.fields) {
		const property = baseJson.properties[field];
		if (property === undefined)
			throw new ReferenceError(
				`Missing generated Knowledge property: ${field}.`,
			);
		properties[field] =
			field === "translations"
				? requireObjectProperties(property, ["en"])
				: field === "semanticRelations"
					? requireRelationProperties(property, selections.relations)
					: property;
	}
	const jsonSchema = deepFreeze({
		$schema: "http://json-schema.org/draft-07/schema#",
		additionalProperties: false,
		properties,
		required: selections.fields,
		type: "object",
	});
	return Object.freeze({
		parse(raw: unknown): unknown {
			const parsed = baseSchema.parse(raw) as Readonly<
				Record<string, unknown>
			>;
			assertExactKeys(parsed, selections.fields, "Knowledge analysis");
			if (selections.fields.includes("translations"))
				assertExactKeys(
					parsed.translations as Readonly<Record<string, unknown>>,
					["en"],
					"Knowledge translations",
				);
			if (selections.fields.includes("semanticRelations"))
				assertExactKeys(
					parsed.semanticRelations as Readonly<
						Record<string, unknown>
					>,
					selections.relations,
					"Knowledge Semantic Relations",
				);
			return parsed;
		},
		toJSONSchema(): unknown {
			return jsonSchema;
		},
	});
}

function selectedKnowledgeFields(request: Readonly<Record<string, unknown>>): {
	fields: string[];
	relations: string[];
} {
	const fields = ["transcription", "definition"].filter((field) =>
		Object.hasOwn(request, field),
	);
	if (request.translations !== undefined) fields.push("translations");
	const relations =
		request.semanticRelations !== undefined &&
		request.semanticRelations !== null &&
		typeof request.semanticRelations === "object" &&
		!Array.isArray(request.semanticRelations)
			? Object.keys(request.semanticRelations)
			: [];
	if (request.semanticRelations !== undefined)
		fields.push("semanticRelations");
	return { fields, relations };
}

function requireObjectProperties(
	value: unknown,
	required: readonly string[],
): unknown {
	if (value === null || typeof value !== "object")
		throw new TypeError(
			"Generated prompt JSON Schema property is not an object.",
		);
	return { ...value, required: [...required] };
}

function requireRelationProperties(
	value: unknown,
	relations: readonly string[],
): unknown {
	if (value === null || typeof value !== "object")
		throw new TypeError(
			"Generated relation JSON Schema property is not an object.",
		);
	const record = value as Readonly<Record<string, unknown>>;
	const relationSchema = record.additionalProperties;
	if (relationSchema === undefined)
		throw new ReferenceError(
			"Generated relation JSON Schema has no value schema.",
		);
	return {
		additionalProperties: false,
		properties: Object.fromEntries(
			relations.map((relation) => [relation, relationSchema]),
		),
		required: [...relations],
		type: "object",
	};
}

function assertExactKeys(
	value: Readonly<Record<string, unknown>>,
	expected: readonly string[],
	label: string,
): void {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		throw new TypeError(`${label} must be an object.`);
	const actual = Object.keys(value);
	if (
		actual.length !== expected.length ||
		actual.some((key) => !expected.includes(key))
	)
		throw new TypeError(`${label} must exactly mirror the request.`);
}

function lazyDefinitions(): Readonly<Record<string, Constraint>> {
	const cache = Object.create(null) as Record<string, Constraint>;
	return new Proxy(cache, {
		get(target, property) {
			if (typeof property !== "string") return undefined;
			const cached = target[property];
			if (cached !== undefined) return cached;
			if (!/^n\d+$/u.test(property)) return undefined;
			const index = Number.parseInt(property.slice(1), 10);
			const encoded = loadEncodedRuntimePromptValidation();
			const width = encoded.offsetWidth;
			const offset = index * width * 2;
			const start = Number.parseInt(
				encoded.definitionOffsetPayload.slice(offset, offset + width),
				16,
			);
			const end = Number.parseInt(
				encoded.definitionOffsetPayload.slice(
					offset + width,
					offset + width * 2,
				),
				16,
			);
			if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end))
				return undefined;
			const decoded = JSON.parse(
				encoded.definitionPayloadBlob.slice(start, end),
			) as Constraint;
			target[property] = decoded;
			return decoded;
		},
		set: () => false,
	});
}

function createRuntimePromptValidationOperations(): ValidationOperations {
	const cache = Object.create(null) as Record<string, ValidationOperation>;
	let proxy: ValidationOperations;
	proxy = new Proxy(cache, {
		get(target, property) {
			if (typeof property !== "string") return undefined;
			const cached = target[property];
			if (cached !== undefined) return cached;
			const operation = Object.freeze(
				constructOperation(property, proxy),
			);
			target[property] = operation;
			return operation;
		},
		set: () => false,
	});
	return proxy;
}

function constructOperation(
	name: string,
	allOperations: ValidationOperations,
): ValidationOperation {
	const signature =
		loadEncodedRuntimePromptValidation().operationSignatures[name];
	if (signature === undefined || signature.version !== 1)
		throw new ReferenceError(`Missing runtime prompt operation: ${name}.`);
	if (signature.regex !== undefined) return regexOperation(signature);
	if (signature.discriminator !== undefined)
		return discriminatorOperation(signature, allOperations);
	if (name.startsWith("dumgen.prompt.readonly."))
		return (value) => ({ value: shallowFreeze(value) });
	if (
		name.startsWith(
			"dumgen.prompt.contextual.laboratory.grammaticalResolution",
		)
	) {
		return name.endsWith("@$.markedContext")
			? markedContextOperation
			: grammaticalMembersOperation;
	}
	if (name.includes("targetClassification.de.highLevelWholeUnit#input@$"))
		return clickedResolvableOperation;
	if (
		name.includes(
			"targetClassification.de.highLevelWholeUnit#model-input@$",
		)
	)
		return classificationModelInputOperation;
	if (name.includes("targetClassification.de.highLevelWholeUnit#output@$"))
		return resolvedTargetShapeOperation;
	if (
		name ===
		"dumgen.prompt.contextual.laboratory.unitShadowClassification#output@$.target<inner>"
	)
		return supportedClassificationRouteOperation;
	if (
		name ===
		"dumgen.prompt.contextual.laboratory.unitShadowClassification#output@$"
	)
		return classifiedTargetShapeOperation;
	if (
		name.startsWith(
			"dumgen.prompt.contextual.knowledge.de.combined#output@",
		)
	)
		return dumgenValidationOperations[
			"dumgen.transitive.unit-shadow.supported-route"
		];

	const delegated = delegatedOperationName(name);
	if (delegated !== undefined) {
		const operation = dumgenValidationOperations[delegated];
		if (operation === undefined)
			throw new ReferenceError(
				`Missing delegated Dumgen operation: ${delegated}.`,
			);
		return operation;
	}
	if (name.startsWith("dumgen.prompt.overwrite."))
		return name.includes("normalizeNfc") || name.includes("NormalizeNfc")
			? normalizeNfc
			: trimString;
	if (name.startsWith("dumgen.prompt.transform.bind")) return identity;
	throw new ReferenceError(
		`Missing runtime prompt operation implementation: ${name}.`,
	);
}

type RuntimeOperationSignature = Readonly<{
	discriminator?: Readonly<{
		branches: readonly Constraint[];
		key: string;
		options: readonly string[];
	}>;
	errorMessage?: string;
	regex?: Readonly<{ flags: string; source: string }>;
	version: 1;
}>;

function delegatedOperationName(name: string): string | undefined {
	const exact: Readonly<Record<string, string>> = {
		"dumgen.prompt.custom.hasEnglishTranslationSelection":
			"dumgen.translation-request.english",
		"dumgen.prompt.custom.hasMarkedInflectionFeature":
			"dumgen.transitive.custom.hasMarkedInflectionFeature",
		"dumgen.prompt.custom.hasSemanticRelationSelection":
			"dumgen.semantic-relation-request.non-empty",
		"dumgen.prompt.custom.isCompactEmojiSequence":
			"dumgen.transitive.custom.isCompactEmojiSequence",
		"dumgen.prompt.custom.isCompactEmojiSequence.2":
			"dumgen.transitive.custom.isCompactEmojiSequence.2",
		"dumgen.prompt.custom.isGermanKnowledgeReading":
			"dumgen.knowledge-reading.de",
		"dumgen.prompt.custom.isLexicalUnitShadow":
			"dumgen.transitive.custom.isLexicalUnitShadow",
		"dumgen.prompt.custom.knowledge.de.combined#output@$.semanticRelations<inner><value><inner>[]":
			"dumgen.relation-target.de",
		"dumgen.prompt.overwrite.dumrelNormalizeNfc":
			"dumgen.transitive.overwrite.dumrelNormalizeNfc",
		"dumgen.prompt.overwrite.dumrelTrimString":
			"dumgen.transitive.overwrite.dumrelTrimString",
		"dumgen.prompt.overwrite.knowledge.de.combined#output@$.definition<inner><inner>":
			"dumgen.transitive.overwrite.trimString",
		"dumgen.prompt.overwrite.knowledge.de.combined#output@$.definition<inner><inner>.2":
			"dumgen.transitive.overwrite.normalizeNfc",
		"dumgen.prompt.overwrite.normalizeNfc":
			"dumgen.transitive.overwrite.normalizeNfc",
		"dumgen.prompt.overwrite.normalizeNfc.2":
			"dumgen.transitive.overwrite.normalizeNfc.2",
		"dumgen.prompt.overwrite.trimString":
			"dumgen.transitive.overwrite.trimString",
		"dumgen.prompt.transform.bindGermanKnowledgeInput":
			"dumgen.bind-knowledge-input.de",
		"dumgen.prompt.transform.bindGermanKnowledgeReading":
			"dumgen.bind-knowledge-reading.de",
		"dumgen.prompt.transform.bindLexicalUnitShadow":
			"dumgen.transitive.transform.bindLexicalUnitShadow",
		"dumgen.prompt.transform.bindSupportedUnitShadow":
			"dumgen.transitive.transform.bindSupportedUnitShadow",
		"dumgen.prompt.transform.normalizeReadingLemma":
			"dumgen.transitive.transform.normalizeReadingLemma",
	};
	return exact[name];
}

const identity: ValidationOperation = (value) => ({ value });
const normalizeNfc: ValidationOperation = (value) => ({
	value: (value as string).normalize("NFC"),
});
const trimString: ValidationOperation = (value) => ({
	value: (value as string).trim(),
});

function regexOperation(
	signature: RuntimeOperationSignature,
): ValidationOperation {
	const metadata = signature.regex;
	if (metadata === undefined)
		throw new TypeError("Missing prompt regex metadata.");
	const pattern = new RegExp(metadata.source, metadata.flags);
	return (value) => ({
		issues: pattern.test(value as string)
			? []
			: [
					{
						code: "invalid_format",
						format: "regex",
						message: signature.errorMessage ?? "Invalid string",
						origin: "string",
						path: [],
						pattern: `/${metadata.source}/${metadata.flags}`,
					} satisfies ParsingIssue,
				],
		value,
	});
}

function discriminatorOperation(
	signature: RuntimeOperationSignature,
	allOperations: ValidationOperations,
): ValidationOperation {
	const metadata = signature.discriminator;
	if (metadata === undefined)
		throw new TypeError("Missing prompt discriminator metadata.");
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
		const selected = Reflect.get(value, metadata.key);
		const branchIndex = metadata.options.indexOf(String(selected));
		if (branchIndex < 0) {
			return {
				issues: [
					{
						code: "invalid_union",
						discriminator: metadata.key,
						errors: [],
						message: `Invalid discriminator value. Expected ${metadata.options.map((option) => `'${option}'`).join(" | ")}`,
						note: "No matching discriminator",
						options: [...metadata.options],
						path: [metadata.key],
					} satisfies ParsingIssue,
				],
				value,
			};
		}
		const root = metadata.branches[branchIndex];
		if (root === undefined)
			throw new ReferenceError("Missing prompt discriminator branch.");
		const parsed = parseValidationArtifact(
			{
				definitions,
				root,
				version: loadEncodedRuntimePromptValidation().version,
			},
			value,
			allOperations,
		);
		return parsed instanceof ParsingError
			? { issues: parsed.issues, value }
			: { value: parsed };
	};
}

const targetPairs = /<TARGET>([^<>]*)<\/TARGET>/gu;

const grammaticalMembersOperation: ValidationOperation = (value) => {
	const input = value as {
		markedContext: string;
		members: readonly string[];
	};
	const members = [...input.markedContext.matchAll(targetPairs)].map(
		(match) => decodeOwnedMarkedContextEntities(match[1] ?? ""),
	);
	return {
		issues:
			members.length === input.members.length &&
			members.every(
				(member, position) => member === input.members[position],
			)
				? []
				: [
						customIssue(
							"members must exactly match TARGET contents in source order.",
							["members"],
						),
					],
		value,
	};
};

function decodeOwnedMarkedContextEntities(member: string): string {
	return member
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");
}

const exactTargetTagPattern = /<TARGET>|<\/TARGET>/gu;
const targetLikeTagPattern = /<\/?TARGET\b[^>]*>/giu;
const wordLikeMemberPattern = /^[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*$/u;
const markedContextOperation: ValidationOperation = (value) => {
	const text = value as string;
	const targetLikeTags = [...text.matchAll(targetLikeTagPattern)];
	const exactTags = [...text.matchAll(exactTargetTagPattern)];
	if (targetLikeTags.length !== exactTags.length)
		return issueResult(
			value,
			"TARGET tags must use the exact literal markup.",
		);
	if (exactTags.length === 0)
		return issueResult(
			value,
			"Marked context requires at least one TARGET member.",
		);
	let openingEnd: number | null = null;
	for (const tag of exactTags) {
		const tagIndex = tag.index;
		if (tag[0] === "<TARGET>") {
			if (openingEnd !== null)
				return issueResult(value, "TARGET tags must not be nested.");
			openingEnd = tagIndex + tag[0].length;
			continue;
		}
		if (openingEnd === null)
			return issueResult(
				value,
				"TARGET tags must be balanced and ordered.",
			);
		if (!wordLikeMemberPattern.test(text.slice(openingEnd, tagIndex)))
			return issueResult(
				value,
				"Each TARGET pair must contain exactly one word-like member without surrounding punctuation, whitespace, or markup.",
			);
		openingEnd = null;
	}
	return openingEnd === null
		? { value }
		: issueResult(value, "TARGET tags must be balanced and ordered.");
};

const clickedResolvableOperation: ValidationOperation = (value) => {
	const input = value as {
		clickedSegmentIndex: number;
		segments: readonly { kind: string }[];
	};
	return {
		issues:
			input.segments[input.clickedSegmentIndex]?.kind === "ResolvableText"
				? []
				: [
						customIssue(
							"The clicked index must reference ResolvableText.",
							["clickedSegmentIndex"],
						),
					],
		value,
	};
};

const classificationModelInputOperation: ValidationOperation = (value) => {
	const input = value as {
		clickedIndex: number;
		markedSentence: string;
		segments: readonly { i: number }[];
	};
	const issues: ParsingIssue[] = [];
	let previous = -1;
	for (const [position, segment] of input.segments.entries()) {
		if (segment.i <= previous)
			issues.push(
				customIssue(
					"Candidate indices must be strictly increasing and unique.",
					["segments", position, "i"],
				),
			);
		previous = segment.i;
	}
	if (!input.segments.some((segment) => segment.i === input.clickedIndex))
		issues.push(
			customIssue(
				"clickedIndex must equal the i of a candidate in segments.",
				["clickedIndex"],
			),
		);
	const openingCount = input.markedSentence.split("<target>").length - 1;
	const closingCount = input.markedSentence.split("</target>").length - 1;
	const openingIndex = input.markedSentence.indexOf("<target>");
	const closingIndex = input.markedSentence.indexOf("</target>");
	if (
		openingCount !== 1 ||
		closingCount !== 1 ||
		closingIndex < openingIndex + "<target>".length
	)
		issues.push(
			customIssue(
				"markedSentence must contain exactly one non-empty <target>...</target> span.",
				["markedSentence"],
			),
		);
	return { issues, value };
};

const resolvedTargetShapeOperation = shapePairOperation(
	"Resolved requires a target and additionalMemberIndices array; Unresolved requires both fields null.",
	(value) => {
		const output = value as {
			decision: string;
			target: unknown;
			additionalMemberIndices: unknown;
		};
		return (
			(output.decision === "Resolved") ===
			(output.target !== null && output.additionalMemberIndices !== null)
		);
	},
);

const classifiedTargetShapeOperation = shapePairOperation(
	"Resolved requires a Family/Kind target; Unresolved requires target null.",
	(value) => {
		const output = value as { decision: string; target: unknown };
		return (output.decision === "Resolved") === (output.target !== null);
	},
);

let supportedRoutes: ReadonlySet<string> | undefined;
const supportedClassificationRouteOperation: ValidationOperation = (value) => {
	const target = value as { family: string; kind: string };
	supportedRoutes ??= new Set(
		encodedDumgenValidationArtifacts.supportedUnitShadowRoutes
			.split("\n")
			.map((route) => route.split("/").slice(1).join("/")),
	);
	const route = `${target.family}/${target.kind}`;
	return supportedRoutes.has(route)
		? { value }
		: {
				issues: [customIssue(`${route} is not a Dumling Lemma route.`)],
				value,
			};
};

function shapePairOperation(
	message: string,
	predicate: (value: unknown) => boolean,
): ValidationOperation {
	return (value) => ({
		issues: predicate(value) ? [] : [customIssue(message)],
		value,
	});
}

function customIssue(
	message: string,
	path: ParsingIssue["path"] = [],
): ParsingIssue {
	return { code: "custom", message, path };
}

function issueResult(value: unknown, message: string) {
	return { issues: [customIssue(message)], value };
}

function shallowFreeze(value: unknown): unknown {
	return value !== null &&
		(typeof value === "object" || typeof value === "function")
		? Object.freeze(value)
		: value;
}

function deepFreeze<Value>(value: Value): Value {
	if (value === null || typeof value !== "object") return value;
	for (const child of Object.values(value)) deepFreeze(child);
	return Object.freeze(value);
}
