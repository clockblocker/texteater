/**
 * The characters of a `.txt` file's bytes (#1190). A byte order mark
 * decides the charset when there is one (UTF-8, UTF-16 LE or BE). Without
 * one, bytes that are mostly zero in every other place are UTF-16 written
 * without a mark; otherwise the bytes are UTF-8 if they decode as such, and
 * windows-1252 if not. Line endings become `\n` and the text NFC.
 */

const utf8Mark = [0xef, 0xbb, 0xbf] as const;

const startsWith = (bytes: Uint8Array, mark: readonly number[]) =>
	mark.every((byte, index) => bytes[index] === byte);

/** UTF-16 BE with its bytes swapped into LE order. */
function swapped(bytes: Uint8Array): Uint8Array {
	const swap = new Uint8Array(bytes.length - (bytes.length % 2));
	for (let index = 0; index < swap.length; index += 2) {
		swap[index] = bytes[index + 1] ?? 0;
		swap[index + 1] = bytes[index] ?? 0;
	}
	return swap;
}

const decodeUtf16 = (bytes: Uint8Array, bigEndian: boolean) =>
	new TextDecoder("utf-16le").decode(bigEndian ? swapped(bytes) : bytes);

/**
 * The byte order of UTF-16 written without a mark, if the bytes look like
 * it: text in a Latin script has a zero in every second byte.
 */
function unmarkedUtf16(bytes: Uint8Array): "le" | "be" | undefined {
	const sample = bytes.subarray(0, 4096);
	if (sample.length < 4) return undefined;
	let evenZeros = 0;
	let oddZeros = 0;
	for (const [index, byte] of sample.entries()) {
		if (byte !== 0) continue;
		if (index % 2 === 0) evenZeros++;
		else oddZeros++;
	}
	const pairs = sample.length / 2;
	if (oddZeros / pairs > 0.3 && evenZeros / pairs < 0.05) return "le";
	if (evenZeros / pairs > 0.3 && oddZeros / pairs < 0.05) return "be";
	return undefined;
}

function decoded(bytes: Uint8Array): string {
	if (startsWith(bytes, utf8Mark)) return new TextDecoder().decode(bytes);
	if (startsWith(bytes, [0xff, 0xfe]))
		return decodeUtf16(bytes.subarray(2), false);
	if (startsWith(bytes, [0xfe, 0xff]))
		return decodeUtf16(bytes.subarray(2), true);
	const utf16 = unmarkedUtf16(bytes);
	if (utf16 !== undefined) return decodeUtf16(bytes, utf16 === "be");
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder("windows-1252").decode(bytes);
	}
}

/** The text of a `.txt` file, with `\n` line endings, as NFC. */
export function decodeTextFile(bytes: Uint8Array): string {
	return decoded(bytes)
		.replace(/^\uFEFF/u, "")
		.replace(/\r\n?|[\u2028\u2029]/gu, "\n")
		.normalize("NFC");
}
