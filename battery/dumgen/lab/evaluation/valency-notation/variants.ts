/**
 * The valency call's bench variants: today's JSON call (and it with the
 * notation's examples in JSON, the examples' control), and the frame
 * written in the German notation (`german.ts`), as plain text, with the
 * headword written in place, or constrained by a grammar (a custom tool's
 * Lark grammar, or a strict JSON schema's string `pattern`). Each sends the
 * same input, model and settings, and its answer is read back into the
 * `{valency: [...]}` Luna proposes, so production's checks score all of
 * them alike.
 */
import { isRecord } from "common-utils";
import { germanGovernablePrepositions } from "dumcorpus/inventories";
import { valencyPrompt } from "../../../src/knowledge/de/valency.js";
import type { LunaRequest } from "../../../src/luna.js";
import { lunaResponsesBody } from "../../../src/openai-luna.js";
import { parseGermanFrame } from "./german.js";
import {
	type Answer,
	jsonExamplesPrompt,
	notationPrompt,
	type Revision,
} from "./prompts.js";
import { revisions } from "./revisions.js";

export const variantNames = [
	"json",
	"json-examples",
	"json-strict",
	"notation",
	"headword",
	"lark",
	"pattern",
	"lead",
	"lead-pattern",
] as const;
export type VariantName = (typeof variantNames)[number];

const quoted = (words: readonly string[]) =>
	words.map((word) => JSON.stringify(word)).join(" | ");

/**
 * The prepositions a fixed phrase's Reflexive may follow (`außer sich`).
 * r1's grammars let any lowercase word stand there, and Luna filled it
 * with runaway letters (`ankommenaluunniit… sich(dat)`).
 */
const fixedPhrasePrepositions = [
	...germanGovernablePrepositions,
	"außer",
	"hinter",
	"neben",
	"ohne",
];

/**
 * The notation as a Lark grammar (OpenAI's custom tool grammars): the
 * frames `german.ts` reads, a Preposition complement's preposition one a
 * governor selects.
 */
export const notationLark = String.raw`start: "-" | frame
frame: ("es ")? slot (" " slot)*
slot: "(" alts ")" | alts
alts: comp ("|" comp)*
comp: REF | PREP " " REF | REFL | FIXED " " REFL | CLAUSE | "es " CLAUSE | "(es) " CLAUSE | ADV | PRED | MARKER " " PRED
REF: /(jmd|jmdn|jmdm|jmds)\.(\/etw\.)?/ | /etw\.(\((nom|akk|dat|gen)\))?/
REFL: "sich(akk)" | "sich(dat)"
CLAUSE: "dass" | "ob" | "w" | "zu+Inf" | "Inf"
ADV: "irgendwo" | "irgendwohin" | "irgendwie" | "irgendwie lange" | "irgendwie viel"
PRED: "ADJ" | "ADJ(subj)" | "ADJ(obj)"
MARKER: "als" | "für"
PREP: ${quoted(germanGovernablePrepositions)}
FIXED: ${quoted(fixedPhrasePrepositions)}`;

/**
 * The same language as one regular expression, for a JSON schema's
 * `pattern`; with `lead`, after the Lemma and a colon.
 */
const notationPattern = (lead: boolean) => {
	const ref = String.raw`(?:(?:jmd|jmdn|jmdm|jmds)\.(?:/etw\.)?|etw\.(?:\((?:nom|akk|dat|gen)\))?)`;
	const prep = `(?:${germanGovernablePrepositions.join("|")})`;
	const refl = String.raw`sich\((?:akk|dat)\)`;
	const clause = String.raw`(?:dass|ob|w|zu\+Inf|Inf)`;
	const comp = [
		ref,
		`${prep} ${ref}`,
		refl,
		`(?:${fixedPhrasePrepositions.join("|")}) ${refl}`,
		clause,
		`es ${clause}`,
		String.raw`\(es\) ${clause}`,
		"irgendwo",
		"irgendwohin",
		"irgendwie(?: lange| viel)?",
		String.raw`(?:(?:als|für) )?ADJ(?:\((?:subj|obj)\))?`,
	].join("|");
	const alts = `(?:${comp})(?:\\|(?:${comp}))*`;
	const slot = String.raw`(?:\(${alts}\)|${alts})`;
	const frame = `(?:-|(?:es )?${slot}(?: ${slot})*)`;
	return lead ? `^[^:\\n]{1,80}: ${frame}$` : `^${frame}$`;
};

/** What a variant asks: its system prompt and how its body asks for the answer. */
export type Variant = {
	readonly name: VariantName;
	readonly systemPrompt: string;
	/** Whether a failed read is asked again; production never retries JSON. */
	readonly retries: boolean;
	/** The Responses API body of one request, `service_tier` included. */
	readonly body: (request: LunaRequest) => Record<string, unknown>;
	/** Luna's proposal read from an answer's text (`answerText`), or why none can be read. */
	readonly decode: (text: string, request: LunaRequest) => Decoded;
};

type Decoded =
	| {
			readonly ok: true;
			readonly output: unknown;
			readonly lenient?: readonly string[];
	  }
	| { readonly ok: false; readonly problem: string };

/** The request with the variant's system prompt, its answer free text. */
const textRequest = (
	request: LunaRequest,
	systemPrompt: string,
): LunaRequest => ({
	systemPrompt,
	input: request.input,
	configuration: request.configuration,
	outputFormat: "text",
});

/** An answer body's free text, or its custom tool call's input. */
export function answerText(body: string): string {
	const decoded: unknown = JSON.parse(body);
	if (!isRecord(decoded) || !Array.isArray(decoded.output)) return "";
	const parts: string[] = [];
	for (const item of decoded.output) {
		if (!isRecord(item)) continue;
		if (item.type === "custom_tool_call" && typeof item.input === "string")
			parts.push(item.input);
		if (Array.isArray(item.content))
			for (const content of item.content)
				if (isRecord(content) && typeof content.text === "string")
					parts.push(content.text);
	}
	return parts.join("");
}

/** The context a frame is read in, from the request's Reading. */
function readingOf(request: LunaRequest) {
	const input = isRecord(request.input) ? request.input : {};
	const reading = isRecord(input.reading) ? input.reading : {};
	return {
		verb: reading.kind === "VERB",
		lemma: typeof reading.lemma === "string" ? reading.lemma : "",
	};
}

const notationDecode =
	(options: { readonly answer: Answer; readonly json?: boolean }) =>
	(answer: string, request: LunaRequest): Decoded => {
		let text = answer.trim();
		if (options.json) {
			try {
				const parsed: unknown = JSON.parse(text);
				if (!isRecord(parsed) || typeof parsed.frame !== "string")
					return { ok: false, problem: "JSON without its frame" };
				text = parsed.frame;
			} catch {
				return { ok: false, problem: "Not JSON" };
			}
		}
		// A lead answer's Lemma goes up to its first colon.
		if (options.answer === "lead") {
			const colon = text.indexOf(":");
			if (colon < 0)
				return { ok: false, problem: "No Lemma before a colon" };
			text = text.slice(colon + 1).trim();
		}
		const { verb, lemma } = readingOf(request);
		const strict = parseGermanFrame(
			text,
			{ verb },
			options.answer === "headword" ? { headword: lemma } : {},
		);
		if (strict.ok)
			return {
				ok: true,
				output: { valency: strict.frame },
				...(strict.lenient.length > 0
					? { lenient: strict.lenient }
					: {}),
			};
		// The repairs r1's answers called for, tried only when the strict read fails.
		const repaired = parseGermanFrame(
			withCaseLabels(text),
			{ verb },
			{ headword: lemma },
		);
		if (!repaired.ok) return { ok: false, problem: strict.error };
		return {
			ok: true,
			output: { valency: repaired.frame },
			lenient: [...repaired.lenient, "Repaired"],
		};
	};

/**
 * A case label written apart (`etw. (Dat)`, `jmdm. (Dat)`, an r1 habit)
 * joined to the etw. it marks, or dropped after a jmd. form, which names
 * its case already.
 */
const withCaseLabels = (text: string) =>
	text
		.replace(
			/(etw\.)\s+\((nom|akk|acc|dat|gen)\.?\)/giu,
			(_, etw: string, mark: string) =>
				`${etw}(${mark.toLowerCase() === "acc" ? "akk" : mark.toLowerCase()})`,
		)
		.replace(/\s+\((?:nom|akk|acc|dat|gen)\.?\)/giu, "");

/** As `lunaResponseOf` reads a JSON answer: its value, or the value unwrapped. */
function jsonDecode(text: string): Decoded {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return { ok: false, problem: "Not JSON" };
	}
	if (isRecord(parsed) && "value" in parsed)
		return { ok: true, output: parsed.value };
	if (isRecord(parsed) && "valency" in parsed)
		return { ok: true, output: parsed };
	return { ok: false, problem: "JSON without its value" };
}

const cached = { promptCaching: true } as const;

/**
 * A schema strict mode takes: every object's every property required and
 * no other allowed, a property the schema left optional made nullable
 * (`Clause.correlate`, `Reflexive.preposition`). Nothing else changes.
 */
function strictSchema(schema: unknown): unknown {
	if (Array.isArray(schema)) return schema.map(strictSchema);
	if (!isRecord(schema)) return schema;
	const strict: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(schema))
		strict[key] = key === "properties" ? value : strictSchema(value);
	if (isRecord(schema.properties)) {
		const required = new Set(
			Array.isArray(schema.required) ? schema.required : [],
		);
		strict.properties = Object.fromEntries(
			Object.entries(schema.properties).map(([key, value]) => [
				key,
				required.has(key)
					? strictSchema(value)
					: { anyOf: [strictSchema(value), { type: "null" }] },
			]),
		);
		strict.required = Object.keys(schema.properties);
		strict.additionalProperties = false;
	}
	return strict;
}

/** A strict answer's nulls dropped, as the non-strict schema leaves the field out. */
function withoutNulls(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(withoutNulls);
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, entry]) => entry !== null)
			.map(([key, entry]) => [key, withoutNulls(entry)]),
	);
}

/** The production body with its JSON schema made strict. */
function strictBody(body: Record<string, unknown>): Record<string, unknown> {
	const text = isRecord(body.text) ? body.text : {};
	const format = isRecord(text.format) ? text.format : {};
	return {
		...body,
		text: {
			...text,
			format: {
				...format,
				strict: true,
				schema: strictSchema(format.schema),
			},
		},
	};
}

/** A text variant's body: the variant's system prompt, the answer free text. */
const textBody = (request: LunaRequest, systemPrompt: string) =>
	lunaResponsesBody(textRequest(request, systemPrompt), cached);

/** A body whose answer is `{frame}` under a strict schema, the frame matching `pattern`. */
const patternBody = (
	request: LunaRequest,
	systemPrompt: string,
	pattern: string,
) => ({
	...textBody(request, systemPrompt),
	text: {
		format: {
			type: "json_schema",
			name: "output",
			strict: true,
			schema: {
				type: "object",
				properties: { frame: { type: "string", pattern } },
				required: ["frame"],
				additionalProperties: false,
			},
		},
	},
});

const larkBody = (request: LunaRequest, systemPrompt: string) => ({
	...textBody(request, systemPrompt),
	tools: [
		{
			type: "custom",
			name: "frame",
			description: "The Reading's Valency Frame in the notation.",
			format: {
				type: "grammar",
				syntax: "lark",
				definition: notationLark,
			},
		},
	],
	tool_choice: { type: "custom", name: "frame" },
});

function jsonVariant(
	name: "json" | "json-examples" | "json-strict",
	revision: Revision,
): Variant {
	const systemPrompt =
		name === "json-examples" ? jsonExamplesPrompt(revision) : valencyPrompt;
	if (name === "json-strict")
		return {
			name,
			systemPrompt,
			retries: false,
			body: (request) => strictBody(lunaResponsesBody(request, cached)),
			decode: (text) => {
				const decoded = jsonDecode(text);
				return decoded.ok
					? { ok: true, output: withoutNulls(decoded.output) }
					: decoded;
			},
		};
	return {
		name,
		systemPrompt,
		retries: false,
		body: (request) =>
			lunaResponsesBody({ ...request, systemPrompt }, cached),
		decode: jsonDecode,
	};
}

export function variant(
	name: VariantName,
	revision: Revision = revisions.r1 as Revision,
): Variant {
	if (name === "json" || name === "json-examples" || name === "json-strict")
		return jsonVariant(name, revision);
	const answer: Answer =
		name === "headword"
			? "headword"
			: name === "lead" || name === "lead-pattern"
				? "lead"
				: "frame";
	const systemPrompt = notationPrompt(revision, answer);
	const base = { name, systemPrompt, retries: true } as const;
	switch (name) {
		case "notation":
		case "headword":
		case "lead":
			return {
				...base,
				body: (request) => textBody(request, systemPrompt),
				decode: notationDecode({ answer }),
			};
		case "lark":
			return {
				...base,
				body: (request) => larkBody(request, systemPrompt),
				decode: notationDecode({ answer }),
			};
		case "pattern":
		case "lead-pattern":
			return {
				...base,
				body: (request) =>
					patternBody(
						request,
						systemPrompt,
						notationPattern(answer === "lead"),
					),
				decode: notationDecode({ answer, json: true }),
			};
	}
}
