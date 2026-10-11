import { validatePracticeQuestion } from "../engine/practiceValidation.js";
import {
  generateRecursion,
  recursionLessons,
  recursionTutorial,
} from "./recursion.js";
import { generateLinks, linksLessons, linksTutorial } from "./links.js";
import { generateSearch, searchLessons, searchTutorial } from "./search.js";
import { generateMemory, memoryLessons, memoryTutorial } from "./memory.js";
import { generateBases, basesLessons, basesTutorial } from "./bases.js";
import { generatePostfix, postfixTutorial, postfixLessons } from "./postfix.js";
import { generateQueue, queueTutorial, queueLessons } from "./queue.js";
import { generateBigO, bigOTutorial, bigOLessons } from "./bigO.js";
export const games = [
  {
    id: "postfix",
    title: "Stack & Slay",
    topic: "Stacks + postfix",
    tagline: "One operator at a time.",
    label: "THE BRAIN STUDIO",
    symbol: "✳",
    generate: generatePostfix,
    tutorial: postfixTutorial,
    lessons: postfixLessons,
  },
  {
    id: "queue",
    title: "Poolside Queue",
    topic: "Queues + circular arrays",
    tagline: "Find your place in line.",
    label: "THE POOL CLUB",
    symbol: "≈",
    generate: generateQueue,
    tutorial: queueTutorial,
    lessons: queueLessons,
  },
  {
    id: "bigO",
    title: "Big-O Afterglow",
    topic: "Loops + growth",
    tagline: "A feel for the bigger picture.",
    label: "THE OBSERVATORY",
    symbol: "✧",
    generate: generateBigO,
    tutorial: bigOTutorial,
    lessons: bigOLessons,
  },
  {
    id: "recursion",
    title: "Recursion Reverie",
    topic: "Recursive C + return values",
    tagline: "Small calls. Big aha.",
    label: "THE ECHO ROOM",
    symbol: "↻",
    generate: generateRecursion,
    lessons: recursionLessons,
    tutorial: recursionTutorial,
    help: "Find the base case first. Then track what each call waits for and what happens as calls return. C comparisons contribute 1 for true and 0 for false.",
  },
  {
    id: "links",
    title: "Link & Bloom",
    topic: "Linked lists + pointers",
    tagline: "Make the right connection.",
    label: "THE CONNECTION CLUB",
    symbol: "∞",
    generate: generateLinks,
    lessons: linksLessons,
    tutorial: linksTutorial,
    help: "Each node stores a value and a next pointer. Follow next to read the list. Preserve needed pointers before changing or freeing a node. Node positions start at 1 when stated; array indices start at 0.",
  },
  {
    id: "search",
    title: "Golden Search",
    topic: "Binary search + bounds",
    tagline: "A little closer, every step.",
    label: "THE GOLDEN HOUR",
    symbol: "⌕",
    generate: generateSearch,
    lessons: searchLessons,
    tutorial: searchTutorial,
    help: "Binary search needs sorted values. low and high are inclusive array indices; mid = (low + high) / 2 uses integer division. Remove the half that cannot contain the target.",
  },
  {
    id: "memory",
    title: "Memory Garden",
    topic: "C allocation + cleanup",
    tagline: "Give every byte a home.",
    label: "THE GARDEN ROOM",
    symbol: "▦",
    generate: generateMemory,
    lessons: memoryLessons,
    tutorial: memoryTutorial,
    help: "malloc reserves uninitialized memory; calloc zeroes it. sizeof *ptr gives the size of one pointed-to element. Check allocation results. Free owned child allocations before their parent. Follow the stated realloc failure policy.",
  },
  {
    id: "bases",
    title: "Basecamp",
    topic: "Binary + octal + hex",
    tagline: "Same value. A new perspective.",
    label: "THE COLOR LAB",
    symbol: "✧",
    generate: generateBases,
    lessons: basesLessons,
    tutorial: basesTutorial,
    help: "A base tells you each column’s place value. Binary uses 0–1, octal 0–7, decimal 0–9, and hex 0–9 plus A–F. Conversion changes the written form, not the number.",
  },
  {
    id: "exam",
    kind: "exam",
    title: "THE EXAM",
    topic: "Full mock midterm",
    tagline: "Two hours. Everything you’ve practiced.",
    label: "THE DRESS REHEARSAL",
    symbol: "◷",
  },
].map((game) =>
  game.generate
    ? {
        ...game,
        generate: (rng, level) =>
          validatePracticeQuestion(game.id, game.generate(rng, level)),
      }
    : game,
);
export const practiceGames = games.filter((game) => game.kind !== "exam");
export const gameById = (id) => games.find((game) => game.id === id);
