import { generateDocs } from "./generate-content/docs/generate-docs.ts";

await generateDocs(process.argv.includes("--check") ? "check" : "write");
