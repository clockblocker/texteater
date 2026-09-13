import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const units = ["Lemma", "Surface", "Reading", "Attestation"] as const;
const lexemeKinds: Record<string, string> = {
  adjective: "ADJ", adverb: "ADV", interjection: "INTJ", noun: "NOUN",
  "proper-noun": "PROPN", verb: "VERB", adposition: "ADP", auxiliary: "AUX",
  "coordinating-conjunction": "CCONJ", determiner: "DET", numeral: "NUM",
  particle: "PART", pronoun: "PRON", "subordinating-conjunction": "SCONJ",
  punctuation: "PUNCT", symbol: "SYM", other: "X",
};
export interface Route {
  language: string;
  family: string;
  kind: string;
  key: string;
  sourcePath: string;
  exportName: string;
  bag: z.ZodType;
  schema: z.ZodType;
}
export async function loadRoutes(): Promise<Route[]> {
  const root = new URL("../../src/schemas/concrete-language/", import.meta.url);
  const paths = (await readdir(root, { recursive: true })).filter(path => path.endsWith(".ts") && path.split("/").length === 3).sort();
  return Promise.all(paths.map(async path => {
    const [language, familyPath, file] = path.split("/") as [string, string, string];
    const family = familyPath[0]!.toUpperCase() + familyPath.slice(1);
    const stem = file.slice(0, -3);
    const kind = family === "Lexeme" ? lexemeKinds[stem]! : stem.split("-").map(part => part[0]!.toUpperCase() + part.slice(1)).join("");
    if (!kind) throw Error(`Unmapped route: ${path}`);
    const mod = await import(fileURLToPath(new URL(path, root)));
    const bags = Object.entries(mod).filter(([name]) => name.endsWith("FeatureBagsSchema"));
    if (bags.length !== 1) throw Error(`Expected one bag schema: ${path}`);
    const bag = bags[0]![1] as z.ZodType;
    return {language, family, kind, sourcePath: path, exportName: bags[0]![0], key: `${language}/${family}/${kind}`, bag,
      schema: z.strictObject({ language: z.literal(language), family: z.literal(family), kind: z.literal(kind), unitKind: z.enum(units), value: bag }),
    };
  }));
}
