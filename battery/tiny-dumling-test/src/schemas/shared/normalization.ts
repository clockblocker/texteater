import { z } from "zod";

function normalizeNfc(value: string) {
	return value.normalize("NFC");
}

export function normalizedStringSchema() {
	return z.string().min(1).overwrite(normalizeNfc);
}
