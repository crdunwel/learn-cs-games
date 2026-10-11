// Independent generated-source contract. This module imports no generator or grader.
const requireThat = (condition, detail) => {
  if (!condition) throw Error(`Invalid malloc question: ${detail}`);
};
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function validateMallocQuestion(question) {
  const meta = question.meta || {};
  requireThat(meta.kind === "malloc-write", "family");
  requireThat(
    Number.isInteger(meta.count) && meta.count >= 12 && meta.count <= 240,
    "count domain",
  );
  requireThat(
    Number.isInteger(meta.variant) && meta.variant >= 0 && meta.variant <= 5,
    "template domain",
  );
  // Derive the expected allocation independently of the generator's definition table.
  let type, name, elementBytes, count, request;
  switch (meta.variant) {
    case 0:
      type = "int";
      name = "scores";
      elementBytes = 4;
      count = meta.count;
      break;
    case 1:
      type = "double";
      name = "measurements";
      elementBytes = 8;
      count = meta.count;
      break;
    case 2:
      type = "float";
      name = "samples";
      elementBytes = 4;
      count = meta.count;
      break;
    case 3:
      requireThat(
        Number.isInteger(meta.length) && meta.length >= 2 && meta.length <= 96,
        "string length domain",
      );
      type = "char";
      name = "copy";
      elementBytes = 1;
      count = meta.length + 1;
      request = `Allocate space for a ${meta.length}-character C string in copy.`;
      break;
    case 4:
      type = "Book";
      name = "book";
      elementBytes = 44;
      count = 1;
      request = "Allocate one Book in book.";
      break;
    case 5:
      type = "Book";
      name = "books";
      elementBytes = 44;
      count = meta.count;
      break;
  }
  const allocation = { type, name, elementBytes, count };
  const answer = `${type} *${name} = malloc(${count} * sizeof *${name});`;
  const code = `${type === "Book" ? "typedef struct Book { char title[40]; int pages; } Book;\n" : ""}// Assume sizeof(${type}) = ${elementBytes} bytes.\n// ${name} is a ${type} pointer; declare it or assume it exists.\n// Write one malloc assignment. No initialization is required.`;
  requireThat(
    question.type === "trace" && question.steps?.length === 1,
    "single trace step",
  );
  const step = question.steps[0];
  requireThat(
    step.kind === "input" && step.format === "malloc",
    "grading metadata",
  );
  requireThat(equal(step.allocation, allocation), "allocation meaning");
  requireThat(step.answer === answer, "model source");
  requireThat(question.code === code, "source and sizeof assumptions");
  requireThat(
    step.prompt ===
      (request || `Allocate ${meta.count} ${type} elements in ${name}.`),
    "stated request",
  );
  requireThat(
    equal(question.visual, {
      kind: "flow",
      label: "What to allocate",
      items: [
        meta.variant === 3
          ? `${meta.length} characters + '\\0'`
          : `${count} ${type} elements`,
        `${elementBytes} bytes each`,
      ],
    }),
    "allocation diagram",
  );
  requireThat(question.reviewSteps?.length === 3, "worked review");
  requireThat(
    question.reviewSteps[0].math ===
      (meta.variant === 3
        ? `${meta.length} + 1 = ${count}`
        : `Count = ${count}`),
    "review count",
  );
  requireThat(
    question.reviewSteps[1].math ===
      `${count} × ${elementBytes} = ${count * elementBytes} bytes`,
    "review byte arithmetic",
  );
  requireThat(question.reviewSteps[2].math === answer, "review model line");
  return question;
}
