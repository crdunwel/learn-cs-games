# Golden Search

Nine question families use binary search with inclusive low/high indices: midpoint index, next bound, returned index, probe count, midpoint value, search direction, next midpoint, remaining candidate count, and maximum checks. All questions include `reviewSteps` showing comparisons and concrete bound arithmetic rather than only the final answer.

Arrays have length 5…10, first value 1…20, and a fixed gap 2…8. They are strictly increasing and indexed from zero. Targets are existing entries, one below/above the endpoints, or one above an entry. `mid = low + (high−low)/2` uses C integer division. A midpoint index and the value stored there are different answers.

## Bounds and counts

Invariant: any possible match remains in inclusive [low, high]. A smaller key sets high=mid−1; a larger key sets low=mid+1. The other bound remains unchanged. Mid is excluded after every mismatch, so the interval strictly shrinks. Empty intervals terminate with −1 without another array read. “Checks” counts middle values examined, rather than every individual if operator.

The new transition families choose a reached mismatching round. If a key matches on its first round, these families become a return-index question instead of inventing an impossible transition. “Next midpoint” explicitly requests −1 if no indices remain. Candidate count includes both endpoints: max(0,high−low+1). The independent oracle builds the surviving candidate-index list, rather than reusing the generator's bound/count formulas.

Worst-check questions ask the maximum over **any key**, clearly distinguishing this from the displayed target's actual trace. After one unsuccessful check, the largest possible remaining interval has floor(size/2) candidates. Repeat until empty; each nonempty interval costs one check. This equals floor(log2(size))+1 for positive size. The independent validator enumerates all found-key and absent-gap/boundary traces to derive their maximum, avoiding a shared logarithm/count helper.

The original iterative trace is checked by a recursive interval-partition oracle, with linear lookup independently verifying the returned index. Every actual question's displayed source and reached round are bound to its metadata, including the comment reporting a[mid]. Worked review rows preserve the original bounds, then show the comparison, changed bound, remaining range and next midpoint. Full-result questions show every reached round in order.

## Generation and verification

Level 1 order is `mid, bounds, result, probe-value, direction`. Levels 2/3 preserve the original four, followed by `probe-value, direction, next-mid, remaining, worst-checks`. Array/key draws remain unchanged; deterministic test tapes must account for the expanded pool. Diagram highlights are teaching cues, and printed questions retain enough input/code to solve without them.

Source and three Learn paths: [search.js](../../src/games/search.js). Independent source/domain/answer contract: [searchValidation.js](../../src/engine/searchValidation.js), invoked through the [practice guard](../../src/engine/practiceValidation.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), and [prior correctness argument](../practice-correctness.md).

[search-expanded.test.js](../../tests/search-expanded.test.js) enumerates all 13,440 distinct generated array/key pairs and every applicable reached round in the four new probe/transition families. Worst-check maxima are checked for each of the 840 generated arrays. It also rejects changed answers, source, displays and midpoint state. [search-expanded-native.test.js](../../tests/search-expanded-native.test.js) compiles actual new C snippets for boundary lengths/start/gaps and reachable branch positions using C11, strict warnings, AddressSanitizer and UndefinedBehaviorSanitizer. Boundary executions complement, rather than replace, exhaustive JavaScript validation. Existing full-search native coverage remains in [practice-native-c.test.js](../../tests/practice-native-c.test.js). These checks do not claim formal verification of the compiler or every English sentence.
