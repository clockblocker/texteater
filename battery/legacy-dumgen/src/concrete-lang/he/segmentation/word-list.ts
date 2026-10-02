import { hebrewWordListData } from "./word-list-data.js";

/**
 * What a Hebrew word allows before it, as flags. A word with none of them is
 * still a word: after ו or ש any word may follow.
 */
export const WordClass = {
	/** ב כ ל מ attach: nouns, numerals, proper nouns, adverbs, pronouns. */
	TakesPreposition: 1,
	/** The written article ה attaches: nouns, numerals, adjectives, participles. */
	TakesArticle: 2,
	/** ב כ ל can hide the article ה: nouns and numerals. */
	TakesHiddenArticle: 4,
	/** A closed-class word (בגלל, כבר, כאשר); no reading cuts into it. */
	FunctionWord: 8,
} as const;

/**
 * A Hebrew word list: the WordClass flags of an unpointed word, or undefined
 * when the list does not know it. Segmentation takes one so a caller can
 * supply its own; the bundled list is the default.
 */
export type HebrewWordList = {
	readonly classesOf: (word: string) => number | undefined;
};

/** The unpointed spelling a list stores: no vowel points or cantillation, Hebrew geresh and gershayim. */
export function normalizeHebrewWord(word: string): string {
	return word
		.normalize("NFD")
		.replaceAll(/\p{M}/gu, "")
		.replaceAll('"', "״")
		.replaceAll(/['’]/gu, "׳")
		.normalize("NFC");
}

// The encoded list maps each Hebrew letter to one ASCII character from
// U+0060, so a word costs one byte, and marks an entry's start with the
// length of the prefix it shares with the entry before it, from U+0040.
const letterBase = 0x60;
const sharedBase = 0x40;
const maxShared = 27;
const blockSize = 64;

function encodeWord(word: string): string {
	let encoded = "";
	for (const letter of word) {
		const code = letter.codePointAt(0) ?? 0;
		if (code >= 0x05d0 && code <= 0x05ea)
			encoded += String.fromCharCode(letterBase + code - 0x05d0);
		else if (code === 0x05f3)
			encoded += String.fromCharCode(letterBase + 27);
		else if (code === 0x05f4)
			encoded += String.fromCharCode(letterBase + 28);
		else return "";
	}
	return encoded;
}

/**
 * Groups words by their exact class flags and front-codes each group in
 * sorted blocks that start with a whole word. Used by the rebuild script.
 */
export function encodeHebrewWordList(
	words: ReadonlyMap<string, number>,
): Record<string, string[]> {
	const groups = new Map<number, string[]>();
	for (const [word, classes] of words) {
		const encoded = encodeWord(word);
		if (!encoded) continue;
		const group = groups.get(classes) ?? [];
		group.push(encoded);
		groups.set(classes, group);
	}
	const encoded: Record<string, string[]> = {};
	for (const classes of [...groups.keys()].sort((a, b) => a - b)) {
		const sorted = [...new Set(groups.get(classes))].sort();
		const blocks: string[] = [];
		for (let start = 0; start < sorted.length; start += blockSize) {
			let block = "";
			let previous = "";
			for (const word of sorted.slice(start, start + blockSize)) {
				let shared = 0;
				while (
					shared < maxShared &&
					shared < previous.length &&
					previous[shared] === word[shared]
				)
					shared += 1;
				block +=
					String.fromCharCode(sharedBase + shared) +
					word.slice(shared);
				previous = word;
			}
			blocks.push(block);
		}
		encoded[String(classes)] = blocks;
	}
	return encoded;
}

function blockHead(block: string): string {
	let end = 1;
	while (end < block.length && block.charCodeAt(end) >= letterBase) end += 1;
	return block.slice(1, end);
}

function blockHas(block: string, word: string): boolean {
	let previous = "";
	let position = 0;
	while (position < block.length) {
		const shared = block.charCodeAt(position) - sharedBase;
		let end = position + 1;
		while (end < block.length && block.charCodeAt(end) >= letterBase)
			end += 1;
		const current =
			previous.slice(0, shared) + block.slice(position + 1, end);
		if (current === word) return true;
		if (current > word) return false;
		previous = current;
		position = end;
	}
	return false;
}

/** A word list over the encoded data the rebuild script writes. */
export function decodeHebrewWordList(
	data: Readonly<Record<string, readonly string[]>>,
): HebrewWordList {
	const groups = Object.entries(data).map(([classes, blocks]) => ({
		classes: Number(classes),
		blocks,
		heads: undefined as readonly string[] | undefined,
	}));
	return {
		classesOf(word) {
			const encoded = encodeWord(normalizeHebrewWord(word));
			if (!encoded) return undefined;
			for (const group of groups) {
				group.heads ??= group.blocks.map(blockHead);
				let low = 0;
				let high = group.heads.length - 1;
				while (low < high) {
					const middle = (low + high + 1) >> 1;
					if ((group.heads[middle] ?? "") <= encoded) low = middle;
					else high = middle - 1;
				}
				const block = group.blocks[low];
				if (block !== undefined && blockHas(block, encoded))
					return group.classes;
			}
			return undefined;
		},
	};
}

/**
 * The bundled list: Wikidata's Hebrew lexemes (CC0 1.0) with a short
 * reviewed supplement; source and version head `word-list-data.ts`.
 */
export const bundledHebrewWordList: HebrewWordList =
	decodeHebrewWordList(hebrewWordListData);
