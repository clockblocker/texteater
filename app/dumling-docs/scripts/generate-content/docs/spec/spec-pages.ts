import type * as Dumling from "dumling/types";
import type * as Dumspec from "dumspec/types";
import { publicHrefForRouteId } from "../routes";
import {
	inPageOrder,
	type RecordTarget,
	recordTargets,
	renderRecordCounts,
	renderRecordLine,
	renderTargetLine,
} from "./record-targets";
import type {
	AcceptedValues,
	EvidenceField,
	RouteFeature,
	SchemaRoute,
} from "./schema-routes";
import {
	evidenceFieldDefinitions,
	kindDefinitions,
} from "./universal-definitions";

/**
 * A page generated from dumspec and the Dumling schemas. A hand-written page
 * at the same route becomes its introduction.
 */
export type SpecPage = Readonly<{
	description: string;
	/** The opening paragraph, shown before the hand-written introduction. */
	lead: string;
	navTitle?: string;
	order: number;
	routeId: string;
	sections: readonly string[];
	title: string;
}>;

/** Sections appended to a hand-written page, such as a universal feature. */
export type SpecAppendix = Readonly<{
	routeId: string;
	sections: readonly string[];
}>;

export type SpecPagesInput = Readonly<{
	/** Routes of every hand-written page, to link only pages that exist. */
	handWrittenRouteIds: ReadonlySet<string>;
	records: readonly Dumspec.SpecRecord[];
	routes: readonly SchemaRoute[];
	rules: readonly Dumspec.Rule[];
}>;

/**
 * A route page lists this many record targets. The rest continue on
 * `<route>/records-2`, `<route>/records-3` and so on.
 */
export const recordTargetsPerPage = 100;

/** Record targets a feature page shows for each value. */
const samplesPerValue = 5;

const languageNames: Readonly<Record<Dumling.Language, string>> = {
	de: "German",
	en: "English",
	he: "Hebrew",
};

const familyOrder: Readonly<Record<Dumling.Family, number>> = {
	Lexeme: 0,
	Morpheme: 1,
	Phraseme: 2,
};

const kindIndex = new Map(
	kindDefinitions.map((definition, index) => [definition.kind, index]),
);

function kebab(name: string): string {
	return name
		.replace(/\[(\w+)\]/gu, "-$1")
		.replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
		.toLowerCase();
}

export function routePageId(
	language: string,
	family: Dumling.Family,
	kind: Dumling.Kind,
): string {
	return `${language}/entity/lemma/${family.toLowerCase()}/${kebab(kind)}`;
}

export function featurePageId(language: string, feature: string): string {
	return `${language}/feature/${kebab(feature)}`;
}

function evidencePageId(language: string, field: EvidenceField): string {
	return `${language}/feature/${evidenceFieldDefinitions[field].path}`;
}

function rulesPageId(language: string): string {
	return `${language}/rules`;
}

/** `gender[psor]` is titled `Gender[psor]`, as UD writes it. */
function featureTitle(feature: string): string {
	return `${feature.charAt(0).toUpperCase()}${feature.slice(1)}`;
}

function link(text: string, routeId: string): string {
	return `[${text}](${publicHrefForRouteId(routeId)})`;
}

function kindOrder(kind: Dumling.Kind): number {
	const index = kindIndex.get(kind);
	if (index === undefined) {
		throw new Error(
			`Kind ${kind} has no universal definition in universal-definitions.ts.`,
		);
	}
	return index;
}

function routeOrder(route: Pick<SchemaRoute, "family" | "kind">): number {
	return 1000 * familyOrder[route.family] + kindOrder(route.kind) + 1;
}

function renderValues(accepted: AcceptedValues): string {
	return [
		...accepted.values.map((value) => `\`${value}\``),
		...(accepted.sets ? ["a set of these"] : []),
		...(accepted.freeText ? ["any text"] : []),
		...(accepted.nullable ? ["`null`"] : []),
	].join(", ");
}

function targetFeatureValue(
	entry: RecordTarget,
	feature: string,
): string | undefined {
	const surface = entry.target.attestation.surface as {
		inflectionalFeatures?: Record<string, unknown> | null;
		lemma: { coreFeatures?: Record<string, unknown> | null };
	};
	const value =
		surface.lemma.coreFeatures?.[feature] ??
		surface.inflectionalFeatures?.[feature];
	return value === null || value === undefined ? undefined : String(value);
}

function targetEvidenceValues(
	entry: RecordTarget,
	field: EvidenceField,
): string[] {
	const attestation = entry.target.attestation;
	switch (field) {
		case "spelling":
			return [attestation.surface.spelling];
		case "historicalStatus": {
			const features = attestation.surface.surfaceFeatures as {
				historicalStatus?: string | null;
			} | null;
			return features?.historicalStatus
				? [features.historicalStatus]
				: [];
		}
		case "memberOrthography":
			return [
				...new Set(
					attestation.members.map((member) => member.orthography),
				),
			];
		case "realizationCoverage":
			return [attestation.realizationCoverage];
	}
}

/** Record target sections split into pages of `recordTargetsPerPage`. */
function paginate<T>(items: readonly T[]): T[][] {
	const pages: T[][] = [];
	for (let start = 0; start < items.length; start += recordTargetsPerPage) {
		pages.push(items.slice(start, start + recordTargetsPerPage));
	}
	return pages.length === 0 ? [[]] : pages;
}

function range(page: number, total: number): string {
	const start = page * recordTargetsPerPage + 1;
	const end = Math.min(total, (page + 1) * recordTargetsPerPage);
	return `${start}–${end}`;
}

function recordPageId(routeId: string, page: number): string {
	return page === 0 ? routeId : `${routeId}/records-${page + 1}`;
}

function renderPageLinks(
	routeId: string,
	pageCount: number,
	total: number,
	current: number,
): string {
	return pageCount < 2
		? ""
		: `Pages: ${Array.from({ length: pageCount }, (_, page) =>
				page === current
					? range(page, total)
					: link(range(page, total), recordPageId(routeId, page)),
			).join(" · ")}.`;
}

function renderFeatureTable(route: SchemaRoute): string {
	if (route.features.length === 0) {
		return "This route has no Core or Inflectional features.";
	}
	return [
		"| Feature | Layer | Allowed values |",
		"| --- | --- | --- |",
		...route.features.map(
			(feature) =>
				`| ${link(`\`${feature.name}\``, featurePageId(route.language, feature.name))} | ${feature.layer} | ${renderValues(feature)} |`,
		),
	].join("\n");
}

function recordsById(
	records: readonly Dumspec.SpecRecord[],
): Map<string, Dumspec.SpecRecord> {
	return new Map(records.map((record) => [record.id, record]));
}

function renderRule(
	rule: Dumspec.Rule,
	language: Dumling.Language,
	byId: ReadonlyMap<string, Dumspec.SpecRecord>,
	headingLevel: "##" | "###",
): string {
	const shownBy = rule.records.map((id) => {
		const record = byId.get(id);
		if (record === undefined) {
			throw new Error(`Rule ${rule.id} cites missing Spec Record ${id}.`);
		}
		return renderRecordLine(record);
	});
	const routes =
		rule.routes.length === 0
			? `Applies to every ${languageNames[language]} route.`
			: `Applies to ${rule.routes
					.map((route) =>
						link(
							route.kind,
							routePageId(
								route.language,
								route.family,
								route.kind,
							),
						),
					)
					.join(", ")}.`;
	return [
		`${headingLevel} \`${rule.id}\``,
		rule.statement,
		[
			routes,
			...(rule.adrs.length === 0
				? []
				: [
						`Rests on ${rule.adrs.map((adr) => `\`${adr}\``).join(", ")}.`,
					]),
		].join(" "),
		shownBy.length === 0
			? "No record shows it yet."
			: ["Shown by:", ...shownBy].join("\n"),
	].join("\n\n");
}

function languageRules(
	rules: readonly Dumspec.Rule[],
	language: Dumling.Language,
): Dumspec.Rule[] {
	return rules.filter((rule) => rule.id.startsWith(`${language}/`));
}

function appliesTo(rule: Dumspec.Rule, route: SchemaRoute): boolean {
	return rule.routes.some(
		(candidate) =>
			candidate.language === route.language &&
			candidate.family === route.family &&
			candidate.kind === route.kind,
	);
}

function renderRouteRules(
	route: SchemaRoute,
	rules: readonly Dumspec.Rule[],
	byId: ReadonlyMap<string, Dumspec.SpecRecord>,
): string {
	const ofLanguage = languageRules(rules, route.language);
	if (ofLanguage.length === 0) {
		return `## Rules\n\nNo ${languageNames[route.language]} Rules yet.`;
	}
	const specific = ofLanguage.filter((rule) => appliesTo(rule, route));
	const general = ofLanguage.filter((rule) => rule.routes.length === 0);
	return [
		"## Rules",
		...(specific.length === 0
			? ["No Rule names this route."]
			: specific.map((rule) =>
					renderRule(rule, route.language, byId, "###"),
				)),
		general.length === 0
			? `${link(`${languageNames[route.language]} Rules`, rulesPageId(route.language))} lists every Rule with its records.`
			: `These Rules apply to every ${languageNames[route.language]} route: ${general
					.map((rule) => `\`${rule.id}\``)
					.join(
						", ",
					)}. ${link(`${languageNames[route.language]} Rules`, rulesPageId(route.language))} states them with their records.`,
	].join("\n\n");
}

function routePages(
	route: SchemaRoute,
	entries: readonly RecordTarget[],
	input: SpecPagesInput,
	byId: ReadonlyMap<string, Dumspec.SpecRecord>,
): SpecPage[] {
	const language = languageNames[route.language];
	const routeId = routePageId(route.language, route.family, route.kind);
	const ordered = inPageOrder(entries);
	const pages = paginate(ordered);
	const intro = `The ${language} \`${route.family}\` route \`${route.kind}\`. Universal definition: ${link(route.kind, routePageId("u", route.family, route.kind))}. Schema: \`dumling/schema/${route.schemaPath}\`.`;
	const records =
		ordered.length === 0
			? "## Records\n\nNo records yet."
			: [
					"## Records",
					`${renderRecordCounts(ordered)} Reviewed records come first and targets with archaic Surfaces last.`,
					renderPageLinks(routeId, pages.length, ordered.length, 0),
					(pages[0] ?? [])
						.map((entry) =>
							renderTargetLine(entry, { notes: true }),
						)
						.join("\n"),
				]
					.filter((section) => section.length > 0)
					.join("\n\n");

	return pages.map((page, index) =>
		index === 0
			? {
					description: `${language} ${route.kind}: its Rules, features and records.`,
					order: 4000 + routeOrder(route),
					routeId,
					lead: intro,
					sections: [
						renderRouteRules(route, input.rules, byId),
						`## Features\n\n${renderFeatureTable(route)}`,
						records,
					],
					title: route.kind,
				}
			: {
					description: `${language} ${route.kind} record targets ${range(index, ordered.length)}.`,
					navTitle: `Records ${range(index, ordered.length)}`,
					order: index,
					routeId: recordPageId(routeId, index),
					lead: `Record targets ${range(index, ordered.length)} of ${ordered.length} for the ${language} ${link(route.kind, routeId)} route. ${renderPageLinks(routeId, pages.length, ordered.length, index)}`,
					sections: [
						page
							.map((entry) =>
								renderTargetLine(entry, { notes: true }),
							)
							.join("\n"),
					],
					title: `${route.kind} records ${range(index, ordered.length)}`,
				},
	);
}

function universalKindPage(
	family: Dumling.Family,
	kind: Dumling.Kind,
	definition: string,
	routes: readonly SchemaRoute[],
	targetsByRoute: ReadonlyMap<string, readonly RecordTarget[]>,
): SpecPage {
	const languages = routes.filter(
		(route) => route.family === family && route.kind === kind,
	);
	return {
		description: `${kind}: its definition and the language pages.`,
		order: 14000 + routeOrder({ family, kind }),
		routeId: routePageId("u", family, kind),
		lead: definition,
		sections: [
			[
				"## Language pages\n",
				...languages.map((route) => {
					const routeId = routePageId(route.language, family, kind);
					const count = targetsByRoute.get(routeId)?.length ?? 0;
					return `- ${link(`${languageNames[route.language]} ${kind}`, routeId)}: ${count === 0 ? "no records yet" : `${count} record target${count === 1 ? "" : "s"}`}`;
				}),
			].join("\n"),
		],
		title: kind,
	};
}

function renderValueGroups(
	values: readonly string[],
	freeText: boolean,
	entries: readonly RecordTarget[],
	valuesOf: (entry: RecordTarget) => readonly string[],
): string {
	const ordered = inPageOrder(entries);
	const byValue = new Map<string, RecordTarget[]>();
	for (const entry of ordered) {
		for (const value of valuesOf(entry)) {
			byValue.set(value, [...(byValue.get(value) ?? []), entry]);
		}
	}
	const attesting = ordered.filter((entry) => valuesOf(entry).length > 0);
	const header = [
		"## Values in the records",
		attesting.length === 0
			? "No records yet."
			: `${renderRecordCounts(attesting)} Each value lists up to ${samplesPerValue} targets, Reviewed first and archaic Surfaces last; the route pages list them all.`,
	];
	if (attesting.length === 0) return header.join("\n\n");

	const shown = [
		...values,
		...[...byValue.keys()]
			.filter((value) => !values.includes(value))
			.toSorted((left, right) => left.localeCompare(right)),
	];
	const groups = shown.map((value) => {
		const withValue = byValue.get(value) ?? [];
		const heading = `### \`${value}\``;
		if (withValue.length === 0) return `${heading}\n\nNo records yet.`;
		return [
			heading,
			`${withValue.length} target${withValue.length === 1 ? "" : "s"}.`,
			withValue
				.slice(0, samplesPerValue)
				.map((entry) => renderTargetLine(entry, { notes: false }))
				.join("\n"),
		].join("\n\n");
	});
	if (freeText && byValue.size > values.length) {
		header.push(
			`This feature accepts any text; ${byValue.size} distinct values occur.`,
		);
	}
	return [...header, ...groups].join("\n\n");
}

function featurePage(
	language: Dumling.Language,
	name: string,
	uses: readonly { feature: RouteFeature; route: SchemaRoute }[],
	entries: readonly RecordTarget[],
	input: SpecPagesInput,
): SpecPage {
	const universalRouteId = featurePageId("u", name);
	const values = [...new Set(uses.flatMap(({ feature }) => feature.values))];
	const freeText = uses.some(({ feature }) => feature.freeText);
	return {
		description: `${languageNames[language]} ${featureTitle(name)}: the routes that allow it and its values in the records.`,
		order: 8010,
		routeId: featurePageId(language, name),
		lead: `The ${languageNames[language]} feature \`${name}\`.${
			input.handWrittenRouteIds.has(universalRouteId)
				? ` Universal definition: ${link(featureTitle(name), universalRouteId)}.`
				: ""
		}`,
		sections: [
			[
				"## Routes\n",
				"| Route | Layer | Allowed values |",
				"| --- | --- | --- |",
				...uses.map(
					({ feature, route }) =>
						`| ${link(route.kind, routePageId(language, route.family, route.kind))} | ${feature.layer} | ${renderValues(feature)} |`,
				),
			].join("\n"),
			renderValueGroups(values, freeText, entries, (entry) => {
				const value = targetFeatureValue(entry, name);
				return value === undefined ? [] : [value];
			}),
		],
		title: featureTitle(name),
	};
}

function evidencePage(
	language: Dumling.Language,
	field: EvidenceField,
	routes: readonly SchemaRoute[],
	entries: readonly RecordTarget[],
): SpecPage {
	const definition = evidenceFieldDefinitions[field];
	const values = [
		...new Set(routes.flatMap((route) => route.evidence[field].values)),
	];
	const nullable = routes.some((route) => route.evidence[field].nullable);
	return {
		description: `${languageNames[language]} ${definition.title}: its values in the records.`,
		order: 8010,
		routeId: evidencePageId(language, field),
		lead: `${definition.definition} Every ${languageNames[language]} route allows ${renderValues({ freeText: false, nullable, sets: false, values })}.`,
		sections: [
			renderValueGroups(values, false, entries, (entry) =>
				targetEvidenceValues(entry, field),
			),
		],
		title: definition.title,
	};
}

function universalEvidencePage(
	field: EvidenceField,
	languages: readonly Dumling.Language[],
): SpecPage {
	const definition = evidenceFieldDefinitions[field];
	return {
		description: `${definition.title}: its definition and the language pages.`,
		order: 18000,
		routeId: evidencePageId("u", field),
		lead: definition.definition,
		sections: [
			[
				"## Language pages\n",
				...languages.map(
					(language) =>
						`- ${link(`${languageNames[language]} ${definition.title}`, evidencePageId(language, field))}`,
				),
			].join("\n"),
		],
		title: definition.title,
	};
}

function rulesPage(
	language: Dumling.Language,
	rules: readonly Dumspec.Rule[],
	byId: ReadonlyMap<string, Dumspec.SpecRecord>,
): SpecPage {
	const ofLanguage = languageRules(rules, language);
	return {
		description: `The ${languageNames[language]} classification Rules from dumspec, with the records that show them.`,
		order: 200,
		routeId: rulesPageId(language),
		lead:
			ofLanguage.length === 0
				? `No ${languageNames[language]} Rules yet.`
				: `The ${ofLanguage.length} ${languageNames[language]} classification Rules. Each route page repeats the Rules that name its route.`,
		sections: [
			...ofLanguage.map((rule) => renderRule(rule, language, byId, "##")),
		],
		title: "Rules",
	};
}

function routeTargets(
	entries: readonly RecordTarget[],
): Map<string, RecordTarget[]> {
	const byRoute = new Map<string, RecordTarget[]>();
	for (const entry of entries) {
		const lemma = entry.target.attestation.surface.lemma;
		const routeId = routePageId(lemma.language, lemma.family, lemma.kind);
		byRoute.set(routeId, [...(byRoute.get(routeId) ?? []), entry]);
	}
	return byRoute;
}

/**
 * The spec's generated pages (ADR 0037): one per language × Family × Kind
 * route and per language feature, the universal Kind index pages, the
 * Surface and Attestation evidence pages and each language's Rules page.
 */
export function buildSpecPages(input: SpecPagesInput): {
	appendices: SpecAppendix[];
	pages: SpecPage[];
} {
	const byId = recordsById(input.records);
	const entries = recordTargets(input.records);
	const targetsByRoute = routeTargets(entries);
	const routes = input.routes.toSorted(
		(left, right) =>
			left.language.localeCompare(right.language) ||
			routeOrder(left) - routeOrder(right),
	);
	const languages = [...new Set(routes.map((route) => route.language))];
	const unknownRoutes = [...targetsByRoute.keys()].filter(
		(routeId) =>
			!routes.some(
				(route) =>
					routePageId(route.language, route.family, route.kind) ===
					routeId,
			),
	);
	if (unknownRoutes.length > 0) {
		throw new Error(
			`Spec Records attest routes the Dumling schemas lack: ${unknownRoutes.join(", ")}.`,
		);
	}

	const pages: SpecPage[] = [];
	const appendices: SpecAppendix[] = [];
	for (const route of routes) {
		pages.push(
			...routePages(
				route,
				targetsByRoute.get(
					routePageId(route.language, route.family, route.kind),
				) ?? [],
				input,
				byId,
			),
		);
	}
	for (const { family, kind, definition } of kindDefinitions) {
		if (routes.some((route) => route.kind === kind)) {
			pages.push(
				universalKindPage(
					family,
					kind,
					definition,
					routes,
					targetsByRoute,
				),
			);
		}
	}

	const featureLanguages = new Map<string, Dumling.Language[]>();
	for (const language of languages) {
		const languageRoutes = routes.filter(
			(route) => route.language === language,
		);
		const languageEntries = entries.filter(
			(entry) => entry.record.language === language,
		);
		const uses = new Map<
			string,
			{ feature: RouteFeature; route: SchemaRoute }[]
		>();
		for (const route of languageRoutes) {
			for (const feature of route.features) {
				uses.set(feature.name, [
					...(uses.get(feature.name) ?? []),
					{ feature, route },
				]);
			}
		}
		for (const [name, featureUses] of uses) {
			pages.push(
				featurePage(
					language,
					name,
					featureUses,
					languageEntries,
					input,
				),
			);
			featureLanguages.set(name, [
				...(featureLanguages.get(name) ?? []),
				language,
			]);
		}
		for (const field of Object.keys(
			evidenceFieldDefinitions,
		) as EvidenceField[]) {
			pages.push(
				evidencePage(language, field, languageRoutes, languageEntries),
			);
		}
		pages.push(rulesPage(language, input.rules, byId));
	}

	for (const field of Object.keys(
		evidenceFieldDefinitions,
	) as EvidenceField[]) {
		pages.push(universalEvidencePage(field, languages));
	}
	for (const [name, featureLanguageList] of featureLanguages) {
		const routeId = featurePageId("u", name);
		if (!input.handWrittenRouteIds.has(routeId)) continue;
		appendices.push({
			routeId,
			sections: [
				[
					"## Language pages\n",
					...featureLanguageList.map(
						(language) =>
							`- ${link(`${languageNames[language]} ${featureTitle(name)}`, featurePageId(language, name))}`,
					),
				].join("\n"),
			],
		});
	}

	return { appendices, pages };
}
