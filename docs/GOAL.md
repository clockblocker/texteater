Build a usefull tool for motivated language learners.

Core value proposition of the tool is "build their own dictionary based on the encountered attestations"

We are to enable any word in a valid text of the supputerd language to be "selectable". 

Learner selects "up" in "I got up in 4:00 am". 
We:
- resolve it as "got up" -> "get up" -> "⏰ get up"
- add the word with all of it's features and relations to user's dictionary
- add "I got up in 4:00 am" to the "attestations" block of the dictionaty entrie for "⏰ get up"

Key is: while the resolved features for the lemma may still be universal, the attestations are unique to the user

Following from that is the lack of the "avoid all possible meanings infodump" policy:
When user selects the "chairs" in "We have 4 chairs in our kitchen", we it as "chairs" -> "chair" -> "🪑 chair"
The existance of "chair" -> "👨🏻‍💼 chair" will not exist in the user's dictionary, until they find the proper context for that “The chair called the meeting to order.”

---
The tool should be language-agnostic and be extendable with arbitrary linguistic relations (semantics, morphologie, etc)

To achieve that we heavily rely on Universal Dependencies as the base of the custom linguistic system

---

The tool should treat all stadalone lingistic entities as fist-class sitizens. Core idea is: we pint the user to the biggest semantic win in a given click. But give them a possibility of drilling down to atoms.

Consider:
- User selects "heulte" in "Obwohl er anderer Meinung war, heulte er mit"
    - We resolve it as "🐺🗣️🤝 mit den Wölfen heulen"
    - We add "Obwohl er anderer Meinung war, heulte er mit" to the "attestations" block of the dictionaty entrie for "🐺🗣️🤝 mit den Wölfen heulen"
- User selects "mit" in "🐺🗣️🤝 mit den Wölfen heulen"
    - We resolve it as "🗣️🤝 mitheulen" and add the "🐺🗣️🤝 mit den Wölfen heulen" to attestations
- User selects "mit" in "🗣️🤝 mitheulen"
    - We resolve it as a separable prefix "mit"