/**
 * The link a Submission holds when it is nothing but one http(s) URL, as
 * the URL parser normalizes it, without its fragment; undefined for text.
 * The Library's text box sends such a Submission as a link (#1196).
 */
export function submittedLink(text: string): string | undefined {
	const trimmed = text.trim();
	if (trimmed.length === 0 || /\s/u.test(trimmed)) return undefined;
	if (!/^https?:\/\//iu.test(trimmed)) return undefined;
	try {
		const url = new URL(trimmed);
		url.hash = "";
		return url.href;
	} catch {
		return undefined;
	}
}
