import { expect, test } from "bun:test";
import { decodeTextFile } from "../../../src/extracted-text/plain-text/decode.js";

const text = "Grüße aus Köln – 5 €\r\nשָׁלוֹם\rEnde";
const expected = "Grüße aus Köln – 5 €\nשָׁלוֹם\nEnde".normalize("NFC");

function utf16(value: string, bigEndian: boolean): number[] {
	const bytes: number[] = [];
	for (let index = 0; index < value.length; index++) {
		const unit = value.charCodeAt(index);
		const pair = [unit & 0xff, unit >> 8];
		bytes.push(...(bigEndian ? pair.reverse() : pair));
	}
	return bytes;
}

test("reads UTF-8, with or without its byte order mark", () => {
	const utf8 = [...new TextEncoder().encode(text)];
	expect(decodeTextFile(new Uint8Array(utf8))).toBe(expected);
	expect(decodeTextFile(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]))).toBe(
		expected,
	);
});

test("reads UTF-16 by its byte order mark, little- or big-endian", () => {
	expect(
		decodeTextFile(new Uint8Array([0xff, 0xfe, ...utf16(text, false)])),
	).toBe(expected);
	expect(
		decodeTextFile(new Uint8Array([0xfe, 0xff, ...utf16(text, true)])),
	).toBe(expected);
});

test("reads UTF-16 written without a mark by its zero bytes", () => {
	const latin = "Es war einmal ein König.\nEr hatte drei Töchter.";
	expect(decodeTextFile(new Uint8Array(utf16(latin, false)))).toBe(latin);
	expect(decodeTextFile(new Uint8Array(utf16(latin, true)))).toBe(latin);
});

test("falls back to windows-1252 when the bytes are not UTF-8", () => {
	const windows1252 = new Uint8Array([
		...[0x47, 0x72, 0xfc, 0xdf, 0x65, 0x20], // Grüße
		...[0x80, 0x20, 0x84, 0x6a, 0x61, 0x93, 0x0d, 0x0a, 0x96], // € „ja“ –
	]);
	expect(decodeTextFile(windows1252)).toBe("Grüße € „ja“\n–");
});

test("composes text to NFC", () => {
	const decomposed = new TextEncoder().encode("Mädchen".normalize("NFD"));
	expect(decodeTextFile(decomposed)).toBe("Mädchen".normalize("NFC"));
});
