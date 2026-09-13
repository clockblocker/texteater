import "./generate-unit-schemas.js";

const { generateValidation } = await import("./validation-artifacts.js");
await generateValidation(process.argv.includes("--check"));
