Demo implimentnation of the core of the app outlined in `../../GOAL.md`.

Scope limitations:
- Only `Hosted shared service` model from the `battery/dumrel/VISION.md`
- Only `de` target language
- Only `en` translation language
- Auth / Payments are out of scope

---

The core flows of the apps are:
1) Text Analysis 
2) Segment Resolution 

## Text Analysis 

```
Text -> Sentence -> Segment
```

User uploads a text
We split it in sentences. 
We split sentences in Segments 

User can oplen up the library of texts and open any one of them at a time to proceed to the second flow


## Segment Resolution 

```
Segment -> Attestation -> Surface -> Reading + Knowledge + Relations
```



Relations:
 Unit Shadow 