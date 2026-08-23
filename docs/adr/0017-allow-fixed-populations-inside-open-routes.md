---
status: accepted
source: "texteater#237"
---

# Allow Fixed Populations inside Open Routes

An Open route may contain a package-owned Fixed Population: a curated set of
ordinary Lemmas and Readings selected deterministically when an Open result
matches their exact identity. The route remains Open for every non-member.

A Fixed Population differs from a Closed Route catalog in control flow. A miss
continues as the ordinary Open result and never produces a Catalog Miss. A hit
uses the authored ordinary value and any authored fixed Knowledge without a
second model call. Population membership, like catalog membership, adds no DTO
flag or persistence model.

German `Lexeme/PRON` is the first Fixed Population. This keeps productive,
indefinite, interrogative, relative, reciprocal, and foreign pronouns available
through Open generation while stabilizing the learner-facing personal,
reflexive, and substantive-possessive identities.
