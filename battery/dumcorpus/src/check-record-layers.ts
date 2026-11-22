import { parseUnit, routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import { selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { languageAttestationIssues } from "./attestation-checks.js";
import { authoredReadingIssues } from "./check-authored-readings.js";
import { knowledgeCoverageIssues } from "./check-knowledge-coverage.js";
import {
	checkKnowledge,
	checkParadigm,
	checkReading,
} from "./check-reading.js";
import { reflexiveMarkerIssues } from "./check-reflexive-readings.js";
import { attestationSyncretismIssues } from "./check-syncretisms.js";
import type {
	AnnotationLayer,
	KnowledgeCoverage,
	ReadingParadigm,
	Segment,
	SegmentationTarget,
	SpecTarget,
} from "./corpus-types.js";
import { checkIfGrundform } from "./grundform/check-if-grundform.js";
import type { SpecCheck } from "./issues.js";
import { sameValue } from "./same-value.js";

type TargetLayerInput = {
	readonly memberSegmentIndices: readonly number[];
	readonly route: { readonly family: string; readonly kind: string };
	readonly attestation?: unknown;
	readonly reading?: {
		readonly emojiDescription?: string;
		readonly knowledge?: unknown;
		readonly paradigm?: Parameters<typeof checkParadigm>[0];
		readonly coverage?: KnowledgeCoverage;
	};
	readonly grundform?: boolean;
};

type LayerIssue = (
	layer: AnnotationLayer,
	check: SpecCheck,
	at: string,
	message: string,
) => void;

type TargetLayerContext = {
	path: string;
	language: Dumling.Language | undefined;
	segments: readonly Segment[];
	resolvable: (index: number) => boolean;
	reviewDepth: AnnotationLayer | undefined;
	issue: LayerIssue;
};

function checkTargetAttestation(
	target: TargetLayerInput,
	context: TargetLayerContext,
	attestationIssue: (check: SpecCheck, at: string, message: string) => void,
): Dumling.Attestation | undefined {
	const { path, language, segments, resolvable } = context;
	if (target.attestation === undefined) {
		attestationIssue(
			"Attestation",
			`${path}.attestation`,
			"A target holds its Attestation",
		);
		return undefined;
	}
	const parsed = parseUnit(target.attestation);
	if (!parsed.success) {
		for (const error of parsed.error.issues)
			attestationIssue(
				"Attestation",
				[path, "attestation", ...error.path].join("."),
				error.message,
			);
		return undefined;
	}
	if (parsed.chain.unitKind !== "Attestation") {
		attestationIssue(
			"Attestation",
			`${path}.attestation`,
			"Expected an Attestation",
		);
		return undefined;
	}
	const attestation = parsed.chain.value;
	if (!sameValue(attestation, target.attestation))
		attestationIssue(
			"Attestation",
			`${path}.attestation`,
			"Store the Attestation exactly as parseUnit normalizes it",
		);
	checkAttestationAlignment(attestation, target, {
		path,
		language,
		segments,
		resolvable,
		attestationIssue,
	});
	return attestation;
}

function checkAttestationAlignment(
	attestation: Dumling.Attestation,
	target: TargetLayerInput,
	context: {
		path: string;
		language: Dumling.Language | undefined;
		segments: readonly Segment[];
		resolvable: (index: number) => boolean;
		attestationIssue: (
			check: SpecCheck,
			at: string,
			message: string,
		) => void;
	},
): void {
	const { path, language, segments, resolvable, attestationIssue } = context;
	const { lemma } = attestation.surface;
	if (language && lemma.language !== language)
		attestationIssue(
			"Attestation",
			`${path}.attestation.surface.language`,
			`A ${language} record holds ${language} Attestations`,
		);
	if (
		lemma.family !== target.route.family ||
		lemma.kind !== target.route.kind
	)
		attestationIssue(
			"Route",
			`${path}.attestation.surface.lemma`,
			`The Attestation's Lemma is ${lemma.family} ${lemma.kind}, not the target's route ${target.route.family} ${target.route.kind}`,
		);
	for (const { check, ...found } of languageAttestationIssues(attestation))
		attestationIssue(
			check,
			`${path}.attestation.${found.path}`,
			found.message,
		);
	for (const found of attestationSyncretismIssues(attestation))
		attestationIssue(
			"Syncretism",
			`${path}.attestation.${found.path}`,
			found.message,
		);
	checkMemberTexts(attestation, target.memberSegmentIndices, {
		path,
		segments,
		resolvable,
		attestationIssue,
	});
	if (target.grundform !== undefined)
		checkTargetGrundform(
			attestation.surface,
			target.grundform,
			path,
			attestationIssue,
		);
}

function checkMemberTexts(
	attestation: Dumling.Attestation,
	indices: readonly number[],
	context: {
		path: string;
		segments: readonly Segment[];
		resolvable: (index: number) => boolean;
		attestationIssue: (
			check: SpecCheck,
			at: string,
			message: string,
		) => void;
	},
): void {
	const { path, segments, resolvable, attestationIssue } = context;
	if (indices.length !== attestation.members.length)
		attestationIssue(
			"Members",
			`${path}.memberSegmentIndices`,
			"Name one Segment per Attestation member",
		);
	for (const [m, member] of attestation.members.entries()) {
		const index = indices[m];
		if (index === undefined || !resolvable(index)) continue;
		const text = segments[index]?.text;
		if (member.attested !== text)
			attestationIssue(
				"Members",
				`${path}.memberSegmentIndices.${m}`,
				`Member ${JSON.stringify(member.attested)} is not Segment ${index} ${JSON.stringify(text)}`,
			);
	}
}

function checkTargetGrundform(
	surface: Dumling.Surface,
	expected: boolean,
	path: string,
	attestationIssue: (check: SpecCheck, at: string, message: string) => void,
): void {
	const verdict = checkIfGrundform(surface);
	// A stated verdict the assessment cannot settle is not checked, so it
	// fails (ADR 0042).
	if (!verdict.success)
		attestationIssue(
			"Grundform",
			`${path}.grundform`,
			`This Surface's Grundform cannot be assessed: ${verdict.error.message}`,
		);
	else if (verdict.value !== expected)
		attestationIssue(
			"Grundform",
			`${path}.grundform`,
			`The assessment finds this Surface ${verdict.value ? "" : "not "}Grundform`,
		);
}

function checkTargetCoverageAndReflexive(
	reading: Dumling.Reading,
	knowledge: Dumrel.ReadingKnowledge,
	authoredCoverage: KnowledgeCoverage | undefined,
	paradigm: ReadingParadigm | undefined,
	hadParadigm: boolean,
	policy: ReturnType<typeof selectKnowledge> | undefined,
	context: TargetLayerContext,
	issue: LayerIssue,
): { coverage?: KnowledgeCoverage; complete: boolean } {
	const { path, reviewDepth } = context;
	const covered = knowledgeCoverageIssues(
		reading,
		knowledge,
		authoredCoverage,
		// Paradigm forms that failed their check aren't held against coverage.
		hadParadigm && paradigm === undefined ? undefined : (paradigm ?? {}),
		policy,
	);
	for (const found of covered.issues)
		issue(
			"Knowledge",
			"KnowledgeCoverage",
			`${path}.${found.path}`,
			found.message,
		);
	if (covered.uncovered.length > 0 && reviewDepth === "Knowledge")
		issue(
			"Knowledge",
			"KnowledgeCoverage",
			`${path}.reading.coverage`,
			`A record reviewed through Knowledge covers each structural aspect its route requests; uncovered: ${covered.uncovered.join(", ")}`,
		);
	for (const found of reflexiveMarkerIssues(
		reading,
		knowledge,
		authoredCoverage,
	))
		issue(
			"Knowledge",
			"ReflexiveMarker",
			`${path}.${found.path}`,
			found.message,
		);
	return {
		coverage: covered.issues.length === 0 ? authoredCoverage : undefined,
		complete: covered.issues.length === 0 && covered.uncovered.length === 0,
	};
}

function checkTargetKnowledgeLayers(
	target: TargetLayerInput,
	reading: Dumling.Reading | undefined,
	context: TargetLayerContext,
	issue: LayerIssue,
): {
	knowledge?: Dumrel.ReadingKnowledge;
	paradigm?: ReadingParadigm;
	coverage?: KnowledgeCoverage;
	complete: boolean;
} {
	const { path, reviewDepth } = context;
	const policy =
		reading !== undefined && target.reading?.knowledge !== undefined
			? selectKnowledge({ route: routeOf(reading.lemma) })
			: undefined;
	let knowledge: Dumrel.ReadingKnowledge | undefined;
	if (reading !== undefined && target.reading?.knowledge !== undefined) {
		const checked = checkKnowledge(
			target.reading.knowledge,
			reading,
			policy,
		);
		for (const failure of checked.issues)
			issue(
				"Knowledge",
				"Knowledge",
				`${path}.${failure.path}`,
				failure.message,
			);
		if (checked.issues.length === 0) knowledge = checked.knowledge;
	} else if (reviewDepth === "Knowledge")
		issue(
			"Knowledge",
			"Knowledge",
			`${path}.reading.knowledge`,
			"A record reviewed through Knowledge holds each target's Reading Knowledge",
		);
	let paradigm: ReadingParadigm | undefined;
	if (reading !== undefined && target.reading?.paradigm !== undefined) {
		const checked = checkParadigm(target.reading.paradigm, reading);
		for (const failure of checked.issues)
			issue(
				"Knowledge",
				"Knowledge",
				`${path}.${failure.path}`,
				failure.message,
			);
		if (checked.issues.length === 0) paradigm = checked.paradigm;
	}
	const authoredCoverage: KnowledgeCoverage | undefined =
		target.reading?.coverage;
	if (
		authoredCoverage !== undefined &&
		target.reading?.knowledge === undefined
	)
		issue(
			"Knowledge",
			"KnowledgeCoverage",
			`${path}.reading.knowledge`,
			"A Reading with coverage holds its Knowledge, {} when it holds no aspect",
		);
	if (knowledge === undefined || reading === undefined)
		return { knowledge, paradigm, complete: false };
	const { coverage, complete } = checkTargetCoverageAndReflexive(
		reading,
		knowledge,
		authoredCoverage,
		paradigm,
		target.reading?.paradigm !== undefined,
		policy,
		context,
		issue,
	);
	return { knowledge, paradigm, coverage, complete };
}

/**
 * Checks one target's Attestation, Reading and Knowledge layers. Returns the
 * target when its route is Dumling's and its Attestation passes, carrying
 * its Reading, Knowledge and coverage when they pass, and whether its
 * Knowledge is valid and covers every structural aspect its route requests.
 */
export function checkTargetLayers(
	target: TargetLayerInput,
	segmented: SegmentationTarget | undefined,
	context: TargetLayerContext,
): { target?: SpecTarget; knowledge: boolean } {
	const { path } = context;
	let failed = false;
	const issue: LayerIssue = (layer, ...rest) => {
		if (layer === "Attestation") failed = true;
		context.issue(layer, ...rest);
	};
	const attestationIssue = (check: SpecCheck, at: string, message: string) =>
		issue("Attestation", check, at, message);

	const attestation = checkTargetAttestation(
		target,
		context,
		attestationIssue,
	);
	if (attestation === undefined) return { knowledge: false };

	const reading = checkReading(target.reading, attestation);
	for (const failure of reading.issues)
		issue("Reading", "Reading", `${path}.${failure.path}`, failure.message);
	if (reading.value)
		for (const found of authoredReadingIssues(reading.value))
			issue(
				"Reading",
				"AuthoredReading",
				`${path}.${found.path}`,
				found.message,
			);
	const { knowledge, paradigm, coverage, complete } =
		checkTargetKnowledgeLayers(target, reading.value, context, issue);
	if (failed) return { knowledge: false };
	if (!segmented) return { knowledge: complete };
	return {
		target: {
			...segmented,
			attestation,
			...(reading.value === undefined ? {} : { reading: reading.value }),
			...(knowledge === undefined ? {} : { knowledge }),
			...(paradigm === undefined ? {} : { paradigm }),
			...(coverage === undefined ? {} : { coverage }),
			...(target.grundform === undefined
				? {}
				: { grundform: target.grundform }),
		},
		knowledge: complete,
	};
}
