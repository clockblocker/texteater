// Generated private catalog loader. Run bun run generate.
import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../concrete-lang/de/authored-closed-sets/member.js";

const loaded = new Map<string, readonly AuthoredMember[]>();
const empty: readonly AuthoredMember[] = [];
/** Literal requires are bundled into synchronous, memoized module initializers. */
export function membersFor(lemma: Dumling.Lemma): readonly AuthoredMember[] {
	const route = `${lemma.language}/${lemma.family}/${lemma.kind}`;
	const cached = loaded.get(route);
	if (cached) return cached;
	let members: readonly AuthoredMember[];
	switch (route) {
		case "de/Lexeme/AUX":
			members = require("./catalog/de-Lexeme-AUX.js").members;
			break;
		case "de/Lexeme/DET":
			members = require("./catalog/de-Lexeme-DET.js").members;
			break;
		case "de/Lexeme/PRON":
			members = require("./catalog/de-Lexeme-PRON.js").members;
			break;
		default:
			return empty;
	}
	loaded.set(route, members);
	return members;
}
/** Private loading diagnostics; not a package-root export. */
export const catalogState = () => ({
	groups: [...loaded.keys()],
	members: [...loaded.values()].reduce((n, m) => n + m.length, 0),
});
