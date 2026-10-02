import { z } from "zod";

// Source: https://universaldependencies.org/hy/feat/ConjType.html
export const ConjTypeSchema = z.enum(["Comp", "Oper"]);
