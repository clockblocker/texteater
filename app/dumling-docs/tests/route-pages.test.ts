import { expect, test } from "bun:test";
import { hrefForAttestedAttestation } from "../scripts/generate-content/docs/attested-attestation";
import { checkRoutePages } from "../scripts/generate-content/docs/spec/route-page-check";
import { loadSchemaRoutes } from "../scripts/generate-content/docs/spec/schema-routes";
import { routePageId } from "../scripts/generate-content/docs/spec/spec-pages";
import { discoverTypedDocs } from "../scripts/generate-content/docs/typed/generate-typed-docs";
import { allSpecExamples } from "../src/lib/docs/spec-examples";

const routes = await loadSchemaRoutes();
const docs = await discoverTypedDocs();
const pageRouteIds = docs.map((doc) => doc.routeId);

test("every schema route has one page and every Kind page has a route", () => {
	expect(checkRoutePages(pageRouteIds, routes)).toEqual([]);
	expect(
		pageRouteIds
			.filter((routeId) =>
				/^(?:de|en|he)\/entity\/lemma\/[a-z]+\/[a-z-]+$/u.test(routeId),
			)
			.toSorted(),
	).toEqual(
		routes
			.map((route) =>
				routePageId(route.language, route.family, route.kind),
			)
			.toSorted(),
	);
});

test("the check reports stale pages and routes without a page", () => {
	const pages = [
		...pageRouteIds.filter(
			(routeId) =>
				routeId !== "he/entity/lemma/lexeme/noun" &&
				routeId !== "u/entity/lemma/morpheme/tone-marking",
		),
		"de/entity/lemma/morpheme/clitic",
		"de/entity/lemma/morpheme/tone-marking",
		"de/feature/aspect",
	];
	expect(checkRoutePages(pages, routes)).toEqual([
		"The page de/entity/lemma/morpheme/clitic has no schema route.",
		"The page de/entity/lemma/morpheme/tone-marking has no schema route.",
		"The page de/feature/aspect names a feature no de route allows.",
		"The schema route he/entity/lemma/lexeme/noun has no page.",
		"The schema route u/entity/lemma/morpheme/tone-marking has no page.",
	]);
});

test("no page is title-only", () => {
	const titleOnly = docs.filter(
		(doc) => doc.body.replace(/^# .*\n/u, "").trim().length === 0,
	);
	expect(titleOnly.map((doc) => doc.routeId)).toEqual([]);
});

test("a route page lists every record target that attests its route", () => {
	const linked = new Set(
		docs
			.filter((doc) => /\/entity\/lemma\//u.test(doc.routeId))
			.flatMap((doc) =>
				[
					...doc.body.matchAll(
						/\]\((\/[a-z]+\/attestation\/[^)]+)\)/gu,
					),
				].map((match) => match[1]),
			),
	);
	const unlinked = allSpecExamples()
		.map(hrefForAttestedAttestation)
		.filter((href) => !linked.has(href));
	expect(unlinked).toEqual([]);
});

test("a universal Kind page links the language pages of its Kind", () => {
	const noun = docs.find(
		(doc) => doc.routeId === "u/entity/lemma/lexeme/noun",
	);
	for (const language of ["de", "en", "he"]) {
		expect(noun?.body).toContain(
			`(/${language}/entity/lemma/lexeme/noun/)`,
		);
	}
});

test("every language feature page links a universal definition that exists", () => {
	const bodies = new Map(docs.map((doc) => [doc.routeId, doc.body]));
	const unresolved = docs
		.filter((doc) =>
			/^(?:de|en|he)\/feature\/(?!attestation|surface)[^/]+$/u.test(
				doc.routeId,
			),
		)
		.flatMap((doc) => {
			const href = doc.body.match(
				/Universal definition: \[.*?\]\(\/(?<routeId>[^#)]+)\/(?:#(?<anchor>[^)]+))?\)/u,
			)?.groups;
			const target = href?.routeId && bodies.get(href.routeId);
			const resolves =
				target !== undefined &&
				target !== "" &&
				(href?.anchor === undefined ||
					target.includes(`<a id="${href.anchor}"></a>`));
			return resolves ? [] : [doc.routeId];
		});
	expect(unresolved).toEqual([]);
});

test("the universal feature table gives a row to each feature without a page", () => {
	const overview = docs.find((doc) => doc.routeId === "u/feature");
	expect(overview?.body).toContain(
		'| <a id="person"></a>`Person` | [Person](https://universaldependencies.org/u/feat/Person.html) | [German](/de/feature/person/), [English](/en/feature/person/), [Hebrew](/he/feature/person/) |',
	);
	expect(overview?.body).not.toContain('<a id="case"></a>');
	expect(pageRouteIds).not.toContain("u/feature/person");
});
