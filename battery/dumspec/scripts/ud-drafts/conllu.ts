/**
 * A minimal CoNLL-U reader (https://universaldependencies.org/format.html)
 * for the UD pre-annotation Draft records start from. It keeps what the
 * converter reads: comments, multiword tokens and the ten word columns.
 * Empty nodes (`8.1`) are dropped.
 */

/** One syntactic word: a row with an integer id. */
export interface UdWord {
	id: number;
	form: string;
	lemma: string;
	upos: string;
	xpos: string;
	feats: Readonly<Record<string, string>>;
	/** The head's id; 0 is the root. */
	head: number;
	deprel: string;
}

/**
 * One written token: a single word, or a multiword token that holds several
 * (`im` holds `in` and `dem`).
 */
interface UdToken {
	form: string;
	words: readonly UdWord[];
}

/** One sentence with its `# key = value` comments. */
export interface UdSentence {
	comments: Readonly<Record<string, string>>;
	text: string;
	tokens: readonly UdToken[];
	words: readonly UdWord[];
}

const columns = 10;
const commentPattern = /^#\s*([^=]+?)\s*=\s?(.*)$/u;

function feats(column: string): Record<string, string> {
	if (column === "_") return {};
	return Object.fromEntries(
		column.split("|").map((pair) => {
			const at = pair.indexOf("=");
			return [pair.slice(0, at), pair.slice(at + 1)];
		}),
	);
}

/**
 * Reads every sentence of a CoNLL-U document. Throws on a malformed row, a
 * sentence without `# text`, or a multiword token whose words are missing.
 */
export function readConllu(source: string): UdSentence[] {
	const sentences: UdSentence[] = [];
	for (const block of source.split(/\n\s*\n/u)) {
		const lines = block.split("\n").filter((line) => line.trim() !== "");
		if (lines.length === 0) continue;
		const comments: Record<string, string> = {};
		const rows: string[][] = [];
		for (const line of lines) {
			if (line.startsWith("#")) {
				const match = commentPattern.exec(line);
				if (match?.[1] !== undefined)
					comments[match[1]] = match[2] ?? "";
				continue;
			}
			const cells = line.split("\t");
			if (cells.length !== columns)
				throw Error(`Expected ${columns} columns: ${line}`);
			rows.push(cells);
		}
		const text = comments.text;
		if (text === undefined)
			throw Error(`A sentence has no # text: ${lines[0]}`);
		const words: UdWord[] = [];
		const ranges: { first: number; last: number; form: string }[] = [];
		for (const [id, form, lemma, upos, xpos, feat, head, deprel] of rows) {
			if (id === undefined || form === undefined) continue;
			const range = /^(\d+)-(\d+)$/u.exec(id);
			if (range) {
				ranges.push({
					first: Number(range[1]),
					last: Number(range[2]),
					form,
				});
				continue;
			}
			if (!/^\d+$/u.test(id)) continue;
			words.push({
				id: Number(id),
				form,
				lemma: lemma ?? "_",
				upos: upos ?? "_",
				xpos: xpos ?? "_",
				feats: feats(feat ?? "_"),
				head: Number(head),
				deprel: deprel ?? "_",
			});
		}
		const tokens: UdToken[] = [];
		for (let index = 0; index < words.length; ) {
			const word = words[index] as UdWord;
			const range = ranges.find(({ first }) => first === word.id);
			if (!range) {
				tokens.push({ form: word.form, words: [word] });
				index++;
				continue;
			}
			const held = words.filter(
				({ id }) => id >= range.first && id <= range.last,
			);
			if (held.length !== range.last - range.first + 1)
				throw Error(`Multiword token ${range.form} lacks its words`);
			tokens.push({ form: range.form, words: held });
			index += held.length;
		}
		sentences.push({ comments, text, tokens, words });
	}
	return sentences;
}
