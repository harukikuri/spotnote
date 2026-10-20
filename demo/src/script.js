// What the videos say: the note, the prompt Spotnote copies for it, and the
// people. PROMPT is what Spotnote writes for this card in a staging build;
// devPrompt(fw), on the dev server (no commit line), for the card written in
// that framework (FRAMEWORKS below).
export const NOTE = "Make the padding bigger";
export const COMMIT = "3f38973";

// The card's component, per framework: where it's written, how the agent's edit
// looks, and the icon Spotnote shows next to its file (kind, from icons.js).
export const FRAMEWORKS = {
  react: {
    kind: "react",
    file: "src/components/ProductCard.jsx",
    line: 7,
    column: 5,
    usedAt: "src/pages/Home.jsx:24",
    diff: [
      [6, " ", "  return ("],
      [7, "-", '    <div className="card" style={{ padding: 16 }}>'],
      [7, "+", '    <div className="card" style={{ padding: 24 }}>'],
      [8, " ", '      <img src={product.image} alt="" />'],
    ],
  },
  vue: {
    kind: "vue",
    file: "src/components/ProductCard.vue",
    line: 6,
    column: 3,
    usedAt: "src/pages/Home.vue:12",
    diff: [
      [5, " ", "<template>"],
      [6, "-", `  <div class="card" :style="{ padding: '16px' }">`],
      [6, "+", `  <div class="card" :style="{ padding: '24px' }">`],
      [7, " ", '    <img :src="product.image" alt="" />'],
    ],
  },
  svelte: {
    kind: "svelte",
    file: "src/components/ProductCard.svelte",
    line: 5,
    column: 1,
    usedAt: "src/pages/Home.svelte:12",
    diff: [
      [4, " ", ""],
      [5, "-", '<div class="card" style="padding: 16px">'],
      [5, "+", '<div class="card" style="padding: 24px">'],
      [6, " ", '  <img src={product.image} alt="" />'],
    ],
  },
};
// "ProductCard.jsx:7": the file and line as Spotnote's label shows them.
export const locOf = (fw) => `${fw.file.split("/").pop()}:${fw.line}`;
export const LOC = locOf(FRAMEWORKS.react);

const template = (fw) => `## Request
${NOTE}

## Target
- file: ${fw.file}
- line: ${fw.line}, column: ${fw.column}
{{commit}}- used at: ${fw.usedAt} (<ProductCard> in Home)
- element: <div class="card">
- text: "Aero Runner $120"
- instance: 1 of 6 rendered from this line (by DOM order) — target the one matching the text above

## Source path (outer → inner)
App > Home > ProductCard

## Current computed styles
  padding: 16px
  margin: 0px
  color: rgb(17, 17, 17)
  background: rgb(255, 255, 255)
  font-size: 15px
  font-weight: 400
  border-radius: 14px`;

// People go by their role, not a name.
export const PROMPT = template(FRAMEWORKS.react).replace(
  "{{commit}}",
  `- commit: ${COMMIT} (the deployed build: if the file has changed since, compare with git show ${COMMIT}:src/components/ProductCard.jsx)\n`,
);
export const devPrompt = (fw) => template(fw).replace("{{commit}}", "");

export const DESIGNER = { name: "Designer", initials: "🎨", color: "#e8912d" };
export const DEVELOPER = { name: "Developer", initials: "💻", color: "#2bac76" };
export const PM = { name: "PM", initials: "PM", color: "#6b7280" };
export const CHANNEL = "design-feedback";
