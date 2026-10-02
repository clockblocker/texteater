import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Gender.html
export const GenderSchema = z.enum(["Com", "Fem", "Masc", "Neut"]);
