# Brazilian Portuguese exercise names

`pt-BR.json` is the editable source for the Brazilian Portuguese exercise-name
pack. It maps every built-in EXDB exercise ID to a Portuguese title. The app
combines that title with the unchanged English source at runtime:

```text
Elevação assistida das pernas deitada (assisted lying leg raise)
```

Custom exercise names are never translated. IDs, plan data, workout history,
imports and exports continue to use the canonical catalogue entries.

Generate the runtime pack with:

```sh
node scripts/build-pt-br-exercise-names.mjs
```

The initial translations were produced from the English EXDB titles with LLM
assistance and must not be described as reviewed by a native speaker unless a
named human reviewer completes that review. They are original translations and
were not copied from another Portuguese exercise dataset.
