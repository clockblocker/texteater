/// <reference types="node" />
// Runs only in the "use node" intake action, which can resolve hosts.
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import type { Scroll } from "dumgen";
import { extractorFor, loneScroll, type Received } from "./extraction";

/**
 * A link Submission's way in (#1188, #1196): the page is fetched, then
 * read by the Extractor its media type picks, and must come out as one
 * Scroll of at least `MIN_ARTICLE_WORDS` words. Anything else is rejected
 * before Price with `LINK_REJECTED_MESSAGE`, which costs the Learner
 * nothing: a failed fetch, a login or bot wall, a page that is not HTML or
 * text, a page built by JavaScript, or a whole book.
 */

/** What a Learner reads when a link gives no article. */
export const LINK_REJECTED_MESSAGE =
	"We couldn't read an article at this link. If the page needs a login or blocks automated access, copy the article and paste it instead.";

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_PAGE_BYTES = 5 * 1024 * 1024;
/** Fewer words than this is a teaser, a cookie wall or an empty JS shell. */
const MIN_ARTICLE_WORDS = 50;

const PAGE_TYPES = new Set([
	"text/html",
	"application/xhtml+xml",
	"text/plain",
]);

const USER_AGENT =
	"Mozilla/5.0 (compatible; TexteaterBot/0.1; +https://github.com/clockblocker/texteater)";

/**
 * Loopback, private, link-local, shared, benchmarking, multicast and
 * reserved ranges: a link must not reach the deployment's own network.
 * IPv4-mapped IPv6 addresses are checked against the IPv4 ranges.
 */
const NON_PUBLIC = new BlockList();
for (const [network, prefix] of [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["224.0.0.0", 3],
] as const)
	NON_PUBLIC.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
	["::", 127],
	["fc00::", 7],
	["fe80::", 10],
	["ff00::", 8],
] as const)
	NON_PUBLIC.addSubnet(network, prefix, "ipv6");

function isPublicAddress(address: string): boolean {
	const family = isIP(address);
	if (family === 0) return false;
	return !NON_PUBLIC.check(address, family === 4 ? "ipv4" : "ipv6");
}

/** Every address a host name resolves to. */
type LookupAll = (host: string) => Promise<readonly string[]>;

const lookupAll: LookupAll = async (host) =>
	(await lookup(host, { all: true, verbatim: true })).map(
		({ address }) => address,
	);

/** Whether every address the URL's host reaches is public. */
async function reachesOnlyPublic(url: URL, resolve: LookupAll) {
	const host = url.hostname.replace(/^\[(.*)\]$/u, "$1");
	const addresses = isIP(host) ? [host] : await resolve(host).catch(() => []);
	return addresses.length > 0 && addresses.every(isPublicAddress);
}

/** The body's bytes, or undefined past `limit`. */
async function cappedBody(
	response: Response,
	limit: number,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
	if (Number(response.headers.get("content-length") ?? 0) > limit) {
		await response.body?.cancel();
		return undefined;
	}
	if (!response.body) return new Uint8Array();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for await (const chunk of response.body) {
		size += chunk.byteLength;
		if (size > limit) {
			await response.body.cancel().catch(() => undefined);
			return undefined;
		}
		chunks.push(chunk);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/** A fetched page: what Extraction reads, and its `Content-Type`. */
export type FetchedPage = {
	readonly received: Omit<Received, "url" | "body"> & {
		readonly url: string;
		readonly body: Uint8Array<ArrayBuffer>;
	};
	readonly contentType: string;
};

/** What fetching uses; a test passes its own. */
export type LinkFetching = {
	readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
	readonly lookup: LookupAll;
};

const network: LinkFetching = {
	fetch: (url, init) => fetch(url, init),
	lookup: lookupAll,
};

/**
 * The page at `link`, following at most `MAX_REDIRECTS` redirects, each to
 * a public http(s) address, within `FETCH_TIMEOUT_MS` and
 * `MAX_PAGE_BYTES`; undefined when it fails, is not HTML or text, or is
 * not a 2xx response.
 */
export async function fetchPage(
	link: string,
	using: LinkFetching = network,
): Promise<FetchedPage | undefined> {
	const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
	try {
		let url = new URL(link);
		for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
			if (url.protocol !== "http:" && url.protocol !== "https:")
				return undefined;
			if (!(await reachesOnlyPublic(url, using.lookup))) return undefined;
			const response = await using.fetch(url.href, {
				redirect: "manual",
				signal,
				headers: {
					"user-agent": USER_AGENT,
					accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
				},
			});
			const location = response.headers.get("location");
			if (response.status >= 300 && response.status < 400 && location) {
				await response.body?.cancel();
				url = new URL(location, url);
				continue;
			}
			const contentType = response.headers.get("content-type") ?? "";
			const mimeType =
				contentType.split(";")[0]?.trim().toLowerCase() ?? "";
			if (!response.ok || !PAGE_TYPES.has(mimeType)) {
				await response.body?.cancel();
				return undefined;
			}
			const body = await cappedBody(response, MAX_PAGE_BYTES);
			if (body === undefined) return undefined;
			const charset = /charset\s*=\s*"?([^";\s]+)/iu.exec(
				contentType,
			)?.[1];
			return {
				contentType,
				received: {
					mimeType,
					url: url.href,
					body,
					...(charset === undefined ? {} : { charset }),
				},
			};
		}
		return undefined;
	} catch {
		return undefined;
	}
}

/** The words of a Scroll's blocks, its own Heading left out. */
function wordCount(scroll: Scroll): number {
	let words = 0;
	for (const block of scroll.blocks) {
		const runs =
			block.kind === "Paragraph"
				? block.inlines
				: block.kind === "Heading"
					? block.runs
					: [];
		for (const inline of runs)
			if (inline.kind === "Run")
				words += inline.text
					.split(/\s+/u)
					.filter((word) => /\p{L}/u.test(word)).length;
	}
	return words;
}

/** What a fetched page reads as: one Scroll and its title, or the rejection. */
export type ReadLink =
	| {
			readonly status: "Read";
			readonly scroll: Scroll;
			readonly title?: string;
	  }
	| { readonly status: "Rejected"; readonly message: string };

/**
 * A fetched page read by its Extractor into one Scroll of at least
 * `MIN_ARTICLE_WORDS` words, titled by its own Heading (defuddle's title
 * for an article).
 */
export function readPage(page: FetchedPage): ReadLink {
	const rejected = {
		status: "Rejected",
		message: LINK_REJECTED_MESSAGE,
	} as const;
	const extractor = extractorFor(page.received);
	if (extractor === undefined) return rejected;
	let found: ReturnType<typeof loneScroll>;
	try {
		found = loneScroll(extractor.extract(page.received));
	} catch {
		return rejected;
	}
	if (found === undefined || wordCount(found.scroll) < MIN_ARTICLE_WORDS)
		return rejected;
	return { status: "Read", ...found };
}
