# Tutorial and writing links

Each tutorial example has a permanent hash URL. The linked dequeue example is:

`https://crdunwel.github.io/learn-cs-games/#queue/learn/linked-dequeue-three`

Use **Copy lesson link** beside the Example selector. The link preserves the current hosting origin and path, so local previews copy local links and GitHub Pages copies public links. Clipboard failure reveals a labeled, read-only URL that selects on focus/click; users can copy it manually. Step position is intentionally not shared: recipients start at the first screen.

## Route contract

[App.jsx](../src/App.jsx) reads [routes.js](../src/engine/routes.js):

| Hash                                | Meaning                                                             |
| ----------------------------------- | ------------------------------------------------------------------- |
| `#`                                 | Homepage                                                            |
| `#queue` (or another known game ID) | Existing game entry; initial mode follows saved tutorial completion |
| `#queue/learn/linked-dequeue-three` | Exact tutorial example, starting at step one in Learn               |
| `#queue/learn`                      | First Learn example                                                 |
| `#queue/play`                       | Play mode                                                           |
| `#code`                             | C Writing Studio                                                    |
| `#code/<exercise-id>`               | A writing exercise; the studio validates the exercise ID            |

Every `game.lessons[].id` is a stable public-link identifier. Games with legacy `tutorial` arrays use `basics`. Changing IDs breaks shared links; retain IDs or add an explicit compatibility mapping when reorganizing content. The timed exam has no Learn/Play subroutes. C Writing Studio is separate from the nine numbered games.

The parser decodes individual segments safely, checks allowed shapes and known game/lesson IDs, bounds input length, and sends malformed or unknown tutorial paths home. It never evaluates route text or writes storage. Unknown writing exercise IDs are handled by the studio's catalog fallback.

## State and navigation

[Tutorial.jsx](../src/components/Tutorial.jsx) updates the URL when selecting an example, including the **Dequeue in C** shortcut. Learn/Play toggles have explicit routes, so browser Back/Forward selects the intended mode. A direct example link forces Learn even when that game's tutorial is already complete.

One `Game` remains mounted when switching examples or modes. Its practice draft, level, and score survive. Example changes reset only the tutorial screen index and copy feedback. Tutorial steps do not create history entries. Navigation within the same game preserves page scroll; switching games or leaving a game scrolls to the top. Copying, sharing, and navigating tutorial examples never awards XP or clears progress.

A bare legacy game hash retains the current mounted mode; a fresh visit uses saved completion. Use the explicit Learn or Play URL when a particular mode must be shared.

Tests: [route parsing](../tests/routes.test.js) checks every registry lesson plus malformed input; [browser navigation](../tests/browser/tutorial-links.spec.js) checks every direct lesson link at 320px, completion overrides, history, practice-draft preservation, copy fallback and the nine-game ordering.
