import { afterEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { api } from "../convex/_generated/api";
import { listLibrary } from "../convex/library";
import { EXTRACTORS, extractorFor, type Received } from "../server/extraction";
import {
	type FetchedPage,
	fetchPage,
	LINK_REJECTED_MESSAGE,
	type LinkFetching,
	readPage,
} from "../server/linkIntake";
import { submittedLink } from "../shared/submitted-link";
import { createTestConvex } from "./support/convex";
import { fakeJev } from "./support/jev";
import { fakeTypeSafe } from "./support/providers";

/**
 * A link Submission (#1196): the Extractors' order, fetching under its
 * rules, a saved article page through defuddle into one Scroll, and the
 * `submitLink` action storing a private Scroll with its URL and Original.
 */

const savedArticle = readFileSync(
	join(import.meta.dir, "fixtures", "saved-article.html"),
);

const encoder = new TextEncoder();

function received(
	mimeType: string,
	extra: Partial<Omit<Received, "mimeType">> = {},
): Received {
	return { mimeType, body: "Er gibt auf.", ...extra };
}

test("Extractors run in order paste, .txt, article, and the first that accepts reads", () => {
	expect(EXTRACTORS.map(({ id }) => id)).toEqual(["paste", "txt", "article"]);
	// A paste is plain text, which the .txt reader would read too: the
	// paste Extractor comes first and wins.
	expect(extractorFor(received("text/plain"))?.id).toBe("paste");
	expect(
		extractorFor(received("text/plain", { name: "verwandlung.txt" }))?.id,
	).toBe("txt");
	expect(
		extractorFor(
			received("text/plain", { url: "https://example.org/a.txt" }),
		)?.id,
	).toBe("txt");
	expect(extractorFor(received("text/html"))?.id).toBe("article");
	expect(extractorFor(received("application/xhtml+xml"))?.id).toBe("article");
	expect(extractorFor(received("image/png"))).toBeUndefined();
});

test("a lone http(s) link is a link Submission; anything else is text", () => {
	expect(submittedLink("  https://example.org/a?b=1#c \n")).toBe(
		"https://example.org/a?b=1",
	);
	expect(submittedLink("HTTP://Example.org")).toBe("http://example.org/");
	expect(submittedLink("Lies https://example.org/a")).toBeUndefined();
	expect(submittedLink("ftp://example.org/a")).toBeUndefined();
	expect(submittedLink("example.org/a")).toBeUndefined();
	expect(submittedLink("Er gibt auf.")).toBeUndefined();
});

/** A web that answers from `pages` by URL; every host resolves to a public address. */
function fakeWeb(
	pages: Record<string, () => Response>,
	addresses: Record<string, readonly string[]> = {},
): LinkFetching & { readonly fetched: string[] } {
	const fetched: string[] = [];
	return {
		fetched,
		fetch: async (url) => {
			fetched.push(url);
			const page = pages[url];
			if (!page) throw new TypeError("fetch failed");
			return page();
		},
		lookup: async (host) => addresses[host] ?? ["93.184.215.14"],
	};
}

const html = (body: BodyInit, headers: Record<string, string> = {}) =>
	new Response(body, {
		status: 200,
		headers: { "content-type": "text/html; charset=utf-8", ...headers },
	});

const redirect = (location: string) =>
	new Response(null, { status: 301, headers: { location } });

test("a saved article page is fetched and read through defuddle into one Scroll titled by the article", async () => {
	const web = fakeWeb({
		"https://stadtbote.example/faehre": () =>
			redirect("/lokales/faehre-fahrt-wieder"),
		"https://stadtbote.example/lokales/faehre-fahrt-wieder": () =>
			html(savedArticle),
	});
	const page = await fetchPage("https://stadtbote.example/faehre", web);
	expect(page?.received.url).toBe(
		"https://stadtbote.example/lokales/faehre-fahrt-wieder",
	);
	expect(page?.contentType).toBe("text/html; charset=utf-8");
	const read = page ? readPage(page) : undefined;
	const paragraph = (text: string) => ({
		kind: "Paragraph" as const,
		inlines: [{ kind: "Run" as const, text }],
	});
	// The cookie banner, navigation, byline, figure with its caption,
	// related links and footer are gone; the word split by `<em>` stays
	// one word.
	expect(read).toEqual({
		status: "Read",
		title: "Die Fähre fährt wieder",
		scroll: {
			kind: "Scroll",
			heading: {
				runs: [{ kind: "Run", text: "Die Fähre fährt wieder" }],
			},
			blocks: [
				paragraph(
					"Nach drei Monaten Pause verbindet die alte Fähre wieder beide Ufer des Flusses. Am Morgen standen schon vor sechs Uhr die ersten Pendler mit ihren Fahrrädern am Anleger.",
				),
				paragraph(
					"„Endlich muss ich nicht mehr über die Brücke fahren“, sagte eine Frau, die jeden Tag zur Arbeit in die Altstadt pendelt. Der Umweg habe sie fast eine halbe Stunde gekostet.",
				),
				{
					kind: "Heading",
					level: 2,
					runs: [
						{ kind: "Run", text: "Neue Motoren, alter Fahrplan" },
					],
				},
				{
					kind: "Paragraph",
					inlines: [
						{
							kind: "Run",
							text: "Die Stadtwerke haben in der Pause beide Motoren ersetzt und die Haus",
						},
						{ kind: "Run", text: "tür", styles: ["Italic"] },
						{
							kind: "Run",
							text: " des Fährhauses neu gestrichen. Der Fahrplan bleibt ",
						},
						{ kind: "Run", text: "unverändert", styles: ["Bold"] },
						{
							kind: "Run",
							text: ": Die Fähre fährt alle zwanzig Minuten, an Sonntagen jede halbe Stunde.",
						},
					],
				},
				paragraph(
					"Für den Winter plant die Stadt kürzere Wartezeiten am Abend. Ob das gelingt, hängt vor allem davon ab, ob genug Personal gefunden wird.",
				),
			],
		},
	});
});

test("a page is decoded by its <meta charset> when its Content-Type names none", async () => {
	const latin1 = savedArticle
		.toString("utf8")
		.replace('<meta charset="utf-8">', '<meta charset="iso-8859-1">');
	const web = fakeWeb({
		"https://stadtbote.example/alt": () =>
			new Response(Buffer.from(latin1, "latin1"), {
				headers: { "content-type": "text/html" },
			}),
	});
	const page = await fetchPage("https://stadtbote.example/alt", web);
	const read = page ? readPage(page) : undefined;
	expect(read?.status === "Read" && read.title).toBe(
		"Die Fähre fährt wieder",
	);
});

test("a link is rejected before any work when its page can't be fetched under the rules", async () => {
	const tooManyRedirects = Object.fromEntries(
		Array.from({ length: 7 }, (_, hop) => [
			`https://loop.example/${hop}`,
			() => redirect(`/${hop + 1}`),
		]),
	);
	const web = fakeWeb(
		{
			...tooManyRedirects,
			"https://blocked.example/a": () =>
				new Response("Just a moment…", {
					status: 403,
					headers: { "content-type": "text/html" },
				}),
			"https://image.example/a.png": () =>
				new Response(new Uint8Array(8), {
					headers: { "content-type": "image/png" },
				}),
			"https://huge.example/a": () =>
				html("<p>…</p>", { "content-length": String(6 * 1024 * 1024) }),
			"https://hop.example/a": () => redirect("http://127.0.0.1/admin"),
			"https://intranet.example/a": () => html(savedArticle),
			"http://[::1]/a": () => html(savedArticle),
		},
		{ "intranet.example": ["93.184.215.14", "10.0.0.7"] },
	);
	for (const link of [
		"https://blocked.example/a",
		"https://image.example/a.png",
		"https://huge.example/a",
		"https://loop.example/0",
		"https://hop.example/a",
		"https://intranet.example/a",
		"http://[::1]/a",
		"https://down.example/a",
		"file:///etc/passwd",
	])
		expect({ link, page: await fetchPage(link, web) }).toEqual({
			link,
			page: undefined,
		});
	// Neither a private address nor one behind a redirect was asked.
	expect(web.fetched).not.toContain("http://127.0.0.1/admin");
	expect(web.fetched).not.toContain("https://intranet.example/a");
	expect(web.fetched).not.toContain("http://[::1]/a");
	expect(
		web.fetched.filter((url) => url.startsWith("https://loop")),
	).toHaveLength(6);
});

test("a page with too few words, or a whole book, is rejected with the paste-it-instead message", () => {
	const page = (
		mimeType: string,
		body: string,
		url = "https://example.org/a",
	): FetchedPage => ({
		contentType: mimeType,
		received: { mimeType, url, body: encoder.encode(body) },
	});
	const rejected = {
		status: "Rejected",
		message: LINK_REJECTED_MESSAGE,
	} as const;
	expect(
		readPage(
			page(
				"text/html",
				"<html><head><title>Bitte warten</title></head><body><p>Bitte aktivieren Sie JavaScript.</p></body></html>",
			),
		),
	).toEqual(rejected);
	const chapter = (title: string) =>
		`${title}\n\n${"Er gibt auf und wohnt im Haus am Fluss. ".repeat(40)}\n\n`;
	expect(
		readPage(
			page(
				"text/plain",
				`${chapter("Kapitel 1")}${chapter("Kapitel 2")}${chapter("Kapitel 3")}`,
				"https://example.org/buch.txt",
			),
		),
	).toEqual(rejected);
});

let restore: (() => void) | undefined;
afterEach(() => {
	restore?.();
	restore = undefined;
});

const ARTICLE_URL = "https://93.184.215.14/lokales/faehre";

/**
 * TypeSafe answered by a fake jev, and the article served at
 * `ARTICLE_URL` (an address, so no lookup runs); `blocked` serves a 403.
 */
function providersAndPage() {
	const providers = fakeTypeSafe(fakeJev());
	const typeSafeFetch = globalThis.fetch;
	const pageRequests: string[] = [];
	globalThis.fetch = (async (url: string | URL | Request, init) => {
		const href = String(url);
		if (href.startsWith("https://93.184.215.14/")) {
			pageRequests.push(href);
			return href === ARTICLE_URL
				? html(savedArticle)
				: new Response("Forbidden", {
						status: 403,
						headers: { "content-type": "text/html" },
					});
		}
		return typeSafeFetch(url, init);
	}) as typeof fetch;
	restore = providers.restore;
	return { providers, pageRequests };
}

test("submitLink stores the article as one Scroll private to its Visitor, with its URL and Original", async () => {
	const { providers, pageRequests } = providersAndPage();
	const t = createTestConvex();
	const submit = (visitorId: string) =>
		t.action(api.orchestration.submitLink, {
			link: ARTICLE_URL,
			visitorId,
		});
	const result = await submit("visitor-1");
	if (result.status !== "Accepted") throw new Error(JSON.stringify(result));
	expect(result.title).toBe("Die Fähre fährt wieder");

	const scroll = await t.run((ctx) => ctx.db.get(result.scrollId));
	expect(scroll).toMatchObject({
		title: "Die Fähre fährt wieder",
		sourceText: ARTICLE_URL,
		owner: "visitor-1",
		link: { url: ARTICLE_URL },
	});
	const original = await t.run(async (ctx) => {
		const id = scroll?.link?.originalId;
		const blob = id ? await ctx.storage.get(id) : null;
		return blob ? blob.text() : null;
	});
	expect(original).toBe(savedArticle.toString("utf8"));

	// Listed and opened only for the Visitor who added it.
	const listed = (visitorId: string) =>
		t.run(async (ctx) =>
			(await listLibrary(ctx, visitorId)).map((entry) => entry.title),
		);
	expect(await listed("visitor-1")).toEqual(["Die Fähre fährt wieder"]);
	expect(await listed("visitor-2")).toEqual([]);
	const view = (visitorId: string) =>
		t.query(api.scrollViews.get, { scrollId: result.scrollId, visitorId });
	expect((await view("visitor-1"))?.originalUrl).toBe(ARTICLE_URL);
	// A link is processed whole, as a paste is: no Folios to ask for (#1216).
	expect((await view("visitor-1"))?.folios).toBeUndefined();
	expect(await view("visitor-2")).toBeNull();

	// The same Visitor's same link opens the same Scroll with no fetch and
	// no model call; another Visitor's gets their own.
	const asked = providers.jev.sent.length;
	expect(await submit("visitor-1")).toEqual(result);
	expect(pageRequests).toEqual([ARTICLE_URL]);
	expect(providers.jev.sent.length).toBe(asked);
	const other = await submit("visitor-2");
	expect(other.status === "Accepted" && other.scrollId).not.toBe(
		result.scrollId,
	);
});

test("submitLink rejects a blocked page before any model work and stores nothing", async () => {
	const { providers } = providersAndPage();
	const t = createTestConvex();
	expect(
		await t.action(api.orchestration.submitLink, {
			link: "https://93.184.215.14/paywall",
			visitorId: "visitor-1",
		}),
	).toEqual({ status: "Rejected", message: LINK_REJECTED_MESSAGE });
	expect(providers.requests).toEqual([]);
	expect(
		await t.run(async (ctx) => ({
			scrolls: await ctx.db.query("scrolls").collect(),
			files: await ctx.db.system.query("_storage").collect(),
		})),
	).toEqual({ scrolls: [], files: [] });
});
