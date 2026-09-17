import type { ChoiceQuestion, Questions } from "promptsmith/typesafe";
import { modelSchemas } from "../../../generated/model-schemas.js";
import type { DumgenOptions, Encounter } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import {
	effectiveConfiguration,
	executeGeneration,
} from "../../../universal/model.js";
import { choice } from "../../../universal/questions.js";
import { recordEvent } from "../../../universal/trace.js";
import { markedContext, parse } from "../../../universal/validation.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";
import { resolveAuthoredGrammarIdentity } from "./authored-identity.js";
import type { GrammarOutput } from "./project.js";
import { routeGuidance } from "./route-guidance.js";
import { verbalCompositionGuidance } from "./verbal-guidance.js";

type Scalar = string | number | boolean | null;
type Field = { values: Scalar[]; open: boolean };
type Schema = {
	type?: string;
	const?: Scalar;
	enum?: Scalar[];
	properties?: Record<string, Schema>;
	anyOf?: Schema[];
	allOf?: Schema[];
};
/** The domain schema owns legal values. Questions add uncertainty without overloading domain null. */
function fields(
	schema: Schema,
	path = "",
	output = new Map<string, Field>(),
): Map<string, Field> {
	for (const branch of [...(schema.anyOf ?? []), ...(schema.allOf ?? [])])
		fields(branch, path, output);
	for (const [key, value] of Object.entries(schema.properties ?? {}))
		fields(value, path ? `${path}.${key}` : key, output);
	if (
		Object.hasOwn(schema, "const") ||
		schema.enum ||
		schema.type === "null" ||
		(schema.type === "string" && !schema.enum)
	) {
		const field = output.get(path) ?? { values: [], open: false };
		for (const value of schema.enum ??
			(Object.hasOwn(schema, "const")
				? [schema.const!]
				: schema.type === "null"
					? [null]
					: []))
			if (!field.values.includes(value)) field.values.push(value);
		field.open ||=
			schema.type === "string" &&
			!schema.enum &&
			!Object.hasOwn(schema, "const");
		output.set(path, field);
	}
	return output;
}
const fieldCatalogs = new Map<string, Map<string, Field>>();
const unmarked = "Unmarked";
function token(value: Scalar): string {
	return value === null ? unmarked : String(value);
}
function featureQuestion(path: string, field: Field): ChoiceQuestion {
	return choice(
		`What is ${path} for this exact supplied whole target? Use the route policy and full sentence. Null/Unmarked is a linguistic value, not uncertainty. Answer a speculative branch only if applicable; code will discard other branches.`,
		Object.fromEntries([
			...field.values.map((value) => [
				token(value),
				value === null
					? "Unmarked/inapplicable under the feature's domain policy"
					: `Feature value ${value}`,
			]),
			["Unresolved", "Applicable but no defensible value can be chosen"],
		]),
	);
}
const normalizations = {
	Keep: "Copy the attested member exactly, preserving licensed variants and required capitals",
	LowerInitial:
		"Only its first letter has ordinary sentence-initial capitalization; lowercase that first letter",
	UpperInitial:
		"Uppercase the initial letter to repair casing or restore required noun/name capitalization",
	Generate:
		"Required spelling correction or constrained suspended-noun completion needs new text",
	Unresolved: "No defensible positional normalization",
};
function transformed(text: string, mode: string): string {
	if (mode === "LowerInitial")
		return text.slice(0, 1).toLocaleLowerCase("de") + text.slice(1);
	if (mode === "UpperInitial")
		return text.slice(0, 1).toLocaleUpperCase("de") + text.slice(1);
	return text;
}
function textCandidates(members: readonly string[], source: string): string[] {
	const quoted = Array.from(
		source.matchAll(/[„“"«]([^“”"»]+)[“”"»]/gu),
		(match) => match[1]!,
	).filter(Boolean);
	const words = source.match(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu) ?? [];
	return [
		...new Set([
			...[members.join(" "), ...members].flatMap((text) => [
				text,
				transformed(text, "LowerInitial"),
				transformed(text, "UpperInitial"),
			]),
			...words,
			...quoted,
		]),
	];
}

const baseGuidance = `The classified route and ordered membership are fixed. Analyze only this whole target in full sentence context. Do not repair membership or reclassify. Return Unresolved when a valid analysis is not defensible.
Core Features belong to the dictionary identity, not the current inflection. Occurrence features belong to Surface. Spelling Canonical does not mean Grundform: finite and declined forms may be Canonical. Canonical Form is the exact dictionary headword, not necessarily a copied Surface. Copy an available headword only when the exact candidate already is that headword; otherwise request text.
Standard orthography includes licensed variants and ordinary sentence-initial capitalization. Typo means a real spelling/casing error. Never modernize licensed variants in normalized members. Keep source members positionally aligned; no added or deleted member. Surface spelling is Variant only for a licensed spelling/abbreviation of the same Lemma, never simply an inflection or typo repair. Historical status concerns archaic grammatical use, not merely old spelling or surrounding context.
Citation has null inflection only for a dictionary/citation use or genuinely unmarked invariant use under the route's policy. Contextual finite verbs and ordinary infinitives have marked bags. Structural null is not uncertainty.
For VERB, hasSepPrefix is only a separable lexical prefix, hasGovPrep only a lexically selected preposition (never an adjunct or a detached prefix), lexicallyReflexive only a required reflexive; verbType Mod is a lexical modal identity. Select string values only from code-supplied candidates. AUX identity is a complete reviewed Lemma; compound membership does not require a singleton identity.
For noun suspension, completion is allowed only for one selected trailing-hyphen member in binary und/oder coordination with a full right compound sharing the literal suffix; retain Full coverage. Ordinary uninflected noun forms and dictionary citations remain distinct.
Partial coverage is allowed only for Idiom, DiscourseFormula, Proverb and Aphorism when fixed lexical material is genuinely unrealized and the full identity remains recoverable. Discontinuous or multi-member targets are not Partial merely due to excluded contextual material.`;

export async function resolveGrammarJudgments(
	options: DumgenOptions,
	encounter: Encounter,
	signal: AbortSignal,
): Promise<GrammarOutput> {
	const route = `${encounter.sentence.language}/${encounter.target.family}/${encounter.target.kind}`;
	if (
		encounter.target.family === "Morpheme" ||
		encounter.target.kind === "PUNCT"
	)
		throw new DumgenFailure(
			"NotImplemented",
			"resolveGrammar",
			"Production is not enabled for this grammar route",
			route,
		);
	const fail = (message: string): never => {
		throw new DumgenFailure("Unresolved", "resolveGrammar", message, route);
	};
	const input = markedContext(encounter);
	const schema = modelSchemas[`grammar/${route}`];
	if (!schema)
		throw new DumgenFailure(
			"NotImplemented",
			"resolveGrammar",
			"No grammatical route",
			route,
		);
	const catalog = fieldCatalogs.get(route) ?? fields(schema as Schema);
	fieldCatalogs.set(route, catalog);
	const verbal = ["VERB", "AUX", "Idiom", "Collocation"].includes(
		encounter.target.kind,
	);
	const auxiliary = encounter.target.kind === "AUX";
	const mapped =
		encounter.target.kind === "DET" || encounter.target.kind === "PRON";
	const identities = auxiliary
		? authoredMembers.filter((member) => member.lemma.kind === "AUX")
		: [];
	const canonicalCandidates = textCandidates(
		input.members,
		input.markedContext.replaceAll(/<\/?TARGET>/gu, ""),
	);
	if (canonicalCandidates.length > 253)
		return fail(
			"Too many complete source-copy candidates for one bounded judgment",
		);
	const questions: Questions = {
		support: choice(
			"Can this fixed target support a coherent analysis on its supplied route?",
			{
				Supported: "Yes, keep route and membership unchanged",
				Unresolved: "No defensible analysis on the supplied target",
			},
		),
		spelling: choice(
			"Is the normalized Surface a canonical spelling of its Lemma or a licensed variant? Inflection alone never means Variant.",
			{ Canonical: null, Variant: null, Unresolved: null },
		),
		historicalStatus: choice(
			"Is the grammatical use of this target archaic?",
			{
				Current: "Current use, including licensed old spelling",
				Archaic: "The grammatical use itself is archaic",
				Unresolved: null,
			},
		),
	};
	if (catalog.has("surface.inflectionalFeatures"))
		questions.inflection = choice(
			"Does this occurrence have a marked inflectional analysis or a null citation/unmarked bag?",
			{
				Marked: "Contextual marked inflection",
				Citation:
					"Dictionary mention or genuinely unmarked/invariant use under this route",
				Unresolved: null,
			},
		);
	for (const [path, field] of catalog) {
		if (
			!(
				path.startsWith("lemma.coreFeatures.") ||
				path.startsWith("surface.inflectionalFeatures.")
			)
		)
			continue;
		if (auxiliary && path.startsWith("lemma.")) continue;
		if (verbal && path.endsWith(".voice")) continue; // Voice follows the judged passive construction.
		questions[path] = field.open
			? choice(
					`Does this lexical identity have ${path.split(".").at(-1)}?`,
					{
						Present:
							"Present; select exact text from candidates later",
						Absent: "No such lexical feature",
						Unresolved: null,
					},
				)
			: featureQuestion(path, field);
	}
	for (const [index] of input.members.entries()) {
		questions[`orthography_${index}`] = choice(
			`Orthography of member ${index}?`,
			{
				Standard:
					"Licensed spelling/capitalization, including variants",
				Typo: "Actual local spelling or casing error",
				Unresolved: null,
			},
		);
		questions[`normalization_${index}`] = choice(
			`How should member ${index} be positionally normalized? Preserve contextual morphology, licensed variants and source order.`,
			normalizations,
		);
	}
	const partial = [
		"Idiom",
		"DiscourseFormula",
		"Proverb",
		"Aphorism",
	].includes(encounter.target.kind);
	if (partial)
		questions.coverage = choice(
			"Is all fixed lexical material realized, or is some genuinely unrealized?",
			{
				Full: "All fixed material realized",
				Partial: "Recoverable fixed material genuinely unrealized",
				Unresolved: null,
			},
		);
	if (auxiliary)
		questions.identity = choice(
			"Which exact reviewed AUX Lemma is realized by the complete supplied target? Finite/compound features belong to its Surface. Select the reviewed canonical identity, including exact-form sein identities when applicable.",
			{
				...Object.fromEntries(
					identities.map((member, index) => [
						`identity_${index}`,
						JSON.stringify(member.lemma),
					]),
				),
				NoMatch:
					"The required AUX identity is absent from the reviewed catalog",
				Unresolved: "Cannot choose a defensible identity",
			},
		);
	else if (encounter.target.kind !== "DET")
		questions.canonical = choice(
			"Is the exact dictionary Canonical Form already one of these copied source candidates? Inflection or Canonical spelling does not establish this. Select only exact available text; otherwise Generate.",
			{
				...Object.fromEntries(
					canonicalCandidates.map((text, index) => [
						`copy_${index}`,
						text,
					]),
				),
				Generate: "Required headword is not available as exact text",
				Unresolved: null,
			},
		);
	const judge = judgmentCaller(options);
	const state = {
		...input,
		route,
		criteria:
			baseGuidance +
			(verbal ? verbalCompositionGuidance : "") +
			(routeGuidance[encounter.target.kind] ?? ""),
		canonicalCandidates,
		reviewedIdentities: identities.map((member) => member.lemma),
	};
	const result = await judge(
		"resolveGrammar",
		`${route}/features`,
		state,
		questions,
		signal,
	);
	const consumed = new Set<string>();
	function selected(id: string): string {
		consumed.add(id);
		const answer = result.answers[id];
		if (
			!answer ||
			answer.type !== "choice" ||
			answer.choice === "Unresolved"
		)
			return fail(`Unresolved applicable question ${id}`);
		return answer.choice;
	}
	try {
		selected("support");
		const core: Record<string, unknown> = {};
		const openFeatures: string[] = [];
		for (const [path, field] of catalog)
			if (path.startsWith("lemma.coreFeatures.") && !auxiliary) {
				const key = path.slice("lemma.coreFeatures.".length),
					answer = selected(path);
				if (field.open) {
					core[key] = null;
					if (answer === "Present") openFeatures.push(key);
				} else core[key] = answer === unmarked ? null : answer;
			}
		const surface: Record<string, unknown> = {
			spelling: selected("spelling"),
			surfaceFeatures:
				selected("historicalStatus") === "Archaic"
					? { historicalStatus: "Archaic" }
					: null,
		};
		if (questions.inflection) {
			surface.inflectionalFeatures = null;
			if (selected("inflection") === "Marked") {
				const bag: Record<string, unknown> = {};
				const form = verbal
					? selected("surface.inflectionalFeatures.verbForm")
					: undefined;
				for (const [path] of catalog)
					if (path.startsWith("surface.inflectionalFeatures.")) {
						const key = path.slice(
							"surface.inflectionalFeatures.".length,
						);
						if (verbal && key === "voice") continue;
						if (
							verbal &&
							key === "participleForm" &&
							form !== "Part"
						)
							continue;
						if (
							verbal &&
							["tense", "mood", "person", "number"].includes(
								key,
							) &&
							form !== "Fin"
						) {
							bag[key] = null;
							continue;
						}
						if (
							verbal &&
							key === "tense" &&
							selected("surface.inflectionalFeatures.mood") ===
								"Imp"
						) {
							bag[key] = null;
							continue;
						}
						const answer = selected(path);
						bag[key] = answer === unmarked ? null : answer;
					}
				if (verbal) bag.voice = bag.passive === null ? null : "Pass";
				surface.inflectionalFeatures = bag;
			}
		}
		const memberOrthographies = input.members.map(
			(_, index) =>
				selected(`orthography_${index}`) as "Standard" | "Typo",
		);
		const normalizationModes = input.members.map((_, index) =>
			selected(`normalization_${index}`),
		);
		const normalizedMembers = input.members.map((text, index) =>
			transformed(text, normalizationModes[index]!),
		);
		const needed: Record<string, string> = {};
		for (const [index, mode] of normalizationModes.entries())
			if (mode === "Generate")
				needed[`member_${index}`] =
					`Required normalized text for supplied member ${index}; preserve its inflection and position. Correct only the judged typo or licensed constrained noun suspension.`;
		const coverage = partial
			? (selected("coverage") as "Full" | "Partial")
			: "Full";
		const mechanicalCanonical =
			coverage === "Full" &&
			surface.spelling === "Canonical" &&
			["DiscourseFormula", "Proverb", "Aphorism", "Fusion"].includes(
				encounter.target.kind,
			);
		const copiedCanonical = () =>
			encounter.target.kind === "DiscourseFormula"
				? normalizedMembers.join(" ").toLocaleLowerCase("de")
				: normalizedMembers.join(" ");
		let lemma: GrammarOutput["lemma"];
		if (auxiliary) {
			const identity = selected("identity");
			if (identity === "NoMatch")
				throw new DumgenFailure(
					"CatalogMiss",
					"resolveGrammar",
					"Required AUX identity is absent from the reviewed catalog",
					route,
				);
			const member =
				identities[Number(identity.slice("identity_".length))];
			if (!member) return fail("Missing selected AUX identity");
			lemma = {
				canonicalForm: member.lemma.canonicalForm,
				coreFeatures: member.lemma.coreFeatures,
			};
			recordEvent(signal, "AuthoredIdentity", { lemma: member.lemma });
		} else {
			const member = mapped
				? await resolveAuthoredGrammarIdentity(
						options,
						{
							kind: encounter.target.kind as "DET" | "PRON",
							spelled: normalizedMembers.join(" "),
							core,
							inflection: surface.inflectionalFeatures,
							markedContext: input.markedContext,
						},
						signal,
					)
				: null;
			if (member) {
				lemma = {
					canonicalForm: member.lemma.canonicalForm,
					coreFeatures: member.lemma.coreFeatures,
				};
				recordEvent(signal, "AuthoredIdentity", {
					lemma: member.lemma,
				});
			} else if (mechanicalCanonical) {
				lemma = {
					canonicalForm: copiedCanonical(),
					coreFeatures: core,
				};
			} else {
				const canonical = selected("canonical");
				lemma = {
					canonicalForm:
						canonicalCandidates[
							Number(canonical.slice("copy_".length))
						],
					coreFeatures: core,
				};
				if (canonical === "Generate")
					needed.canonicalForm =
						"Exact dictionary Canonical Form of the fixed supplied identity. Supply only missing text, not grammatical labels.";
			}
		}

		try {
			parse(
				`grammar/${route}`,
				{
					lemma: {
						...lemma,
						canonicalForm: lemma.canonicalForm ?? "pending",
					},
					surface,
					memberOrthographies,
					normalizedMembers,
					realizationCoverage: coverage,
				},
				"resolveGrammar",
				true,
			);
		} catch {
			recordEvent(signal, "IncoherentApplicableFeatures", {
				lemma,
				surface,
			});
			return fail(
				"Applicable grammatical answers do not compose into a legal analysis",
			);
		}
		if (Object.keys(needed).length) {
			const generated = await executeGeneration(
				options,
				{
					stage: "resolveGrammar",
					route: `${route}/text`,
					input: {
						...input,
						route,
						needed,
						textPolicy:
							routeGuidance[encounter.target.kind] ??
							verbalCompositionGuidance,
						judgedSurface: surface,
						judgedCore: core,
						memberOrthographies,
					},
					systemPrompt:
						"Supply exactly the requested missing German text fields. All grammatical judgments and target membership are fixed. Never emit bounded labels, add attested members, modernize a licensed variant, or use a different identity. Canonical Form is the dictionary headword; normalized member text retains occurrence morphology. For verbal headwords use the lexical infinitive with required reflexive/preposition/prefix material, not the whole auxiliary chain. For proverbial/aphoristic canonical wording omit punctuation. Noun suspension completion must preserve the literal shared suffix from the binary right conjunct.",
					outputSchema: {
						type: "object",
						properties: Object.fromEntries(
							Object.keys(needed).map((key) => [
								key,
								{ type: "string", minLength: 1 },
							]),
						),
						required: Object.keys(needed),
						additionalProperties: false,
					},
					configuration: effectiveConfiguration(options, route),
					signal,
				},
				(raw) => {
					if (!raw || typeof raw !== "object" || Array.isArray(raw))
						throw Error("Expected requested text fields");
					const values = raw as Record<string, unknown>;
					if (
						Object.keys(values).length !==
							Object.keys(needed).length ||
						Object.keys(needed).some(
							(key) =>
								typeof values[key] !== "string" ||
								!(values[key] as string).trim() ||
								(key.startsWith("member_") &&
									/\s/u.test(values[key] as string)),
						)
					)
						throw Error(
							"Generated text does not match the requested fields",
						);
					return values as Record<string, string>;
				},
			);
			if (generated.canonicalForm)
				lemma.canonicalForm = generated.canonicalForm;
			for (const [index] of normalizedMembers.entries())
				if (generated[`member_${index}`])
					normalizedMembers[index] = generated[`member_${index}`]!;
		}
		if (mechanicalCanonical) lemma.canonicalForm = copiedCanonical();
		if (openFeatures.length) {
			const words = [
				...normalizedMembers,
				...String(lemma.canonicalForm).split(/\s+|\.\.\./u),
			].filter(Boolean);
			const followup: Questions = {};
			const candidates: Record<string, string[]> = {};
			for (const key of openFeatures) {
				candidates[key] = [
					...new Set(
						key === "hasSepPrefix"
							? words.flatMap((word) =>
									Array.from(
										{ length: word.length },
										(_, index) => word.slice(0, index + 1),
									),
								)
							: words,
					),
				];
				if (candidates[key]!.length > 254)
					return fail("Too many complete lexical-string candidates");
				followup[key] = choice(
					`Choose the exact ${key} established by the lexical feature judgment. Prefixes are separable prefixes; governed prepositions must be lexically selected and cannot be a detached prefix or adjunct.`,
					{
						...Object.fromEntries(
							candidates[key]!.map((text, index) => [
								`text_${index}`,
								text,
							]),
						),
						Unresolved:
							"None is defensible; do not revise the prior feature judgment",
					},
				);
			}
			const resolved = await judge(
				"resolveGrammar",
				`${route}/lexical-strings`,
				{
					...state,
					lemma: JSON.stringify(lemma),
					normalizedMembers,
					candidates,
				},
				followup,
				signal,
			);
			for (const key of openFeatures) {
				const answer = resolved.answers[key];
				if (
					!answer ||
					answer.type !== "choice" ||
					answer.choice === "Unresolved"
				)
					return fail(`Unresolved ${key}`);
				core[key] =
					candidates[key]![
						Number(answer.choice.slice("text_".length))
					];
			}
		}
		const output = {
			lemma,
			surface,
			memberOrthographies,
			normalizedMembers,
			realizationCoverage: coverage,
		};
		try {
			return parse<GrammarOutput>(
				`grammar/${route}`,
				output,
				"resolveGrammar",
				true,
			);
		} catch {
			recordEvent(signal, "IncoherentApplicableFeatures", output);
			return fail(
				"Applicable grammatical answers do not compose into a legal analysis",
			);
		}
	} finally {
		recordEvent(signal, "JudgmentApplicability", {
			consumed: [...consumed],
			ignored: Object.keys(questions).filter((id) => !consumed.has(id)),
		});
	}
}
