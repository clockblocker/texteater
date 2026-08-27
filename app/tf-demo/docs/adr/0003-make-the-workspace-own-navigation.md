---
status: accepted
---

# Make the workspace own navigation

tf-demo has one canonical application URL, `/`. Library, Text, and Note are
workspace subjects rather than browser destinations. Following a subject from
the Library opens a Sheet in the central Pane; following one from a Sheet opens
another Sheet in that Pane. A Segment Selection presents its result as a
Pane-local Card. During an active Resolution, each newly available Attestation,
Surface, Lemma, or Reading projection becomes the foremost Card in that one
Pane-local Card Layer while prior steps remain underneath. Completion converges
the four session-scoped Resolution Step Notes to their canonical Note subjects;
failure instead keeps the operational Resolution subject foremost.

The Library remains the Navigation Anchor at the base of the central Pane. A
Library command reveals that base subject to Locked Sheet rules, so it does not
claim that the Library is visible when a Locked Sheet covers it. Settings is
application-shell state because it is not a Text or Note workspace subject.

Placed Pane and Sheet state is persisted in versioned browser storage. Card
Layers, drag sessions, announcements, and Settings state remain transient.
Resource URLs and cold-visit route intents are deliberately unsupported: an old
path is canonicalized to `/`, after which the saved workspace session is
restored.
