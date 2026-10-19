// What the video says: the note, the prompt Spotnote copies for it, and the
// people. The prompt is what Spotnote writes for this card in a staging build.
export const NOTE = "Make the padding bigger";
export const LOC = "ProductCard.jsx:7";
export const COMMIT = "3f38973";

export const PROMPT = `## Request
${NOTE}

## Target
- file: src/components/ProductCard.jsx
- line: 7, column: 5
- commit: ${COMMIT} (the deployed build: if the file has changed since, compare with git show ${COMMIT}:src/components/ProductCard.jsx)
- used at: src/pages/Home.jsx:24 (<ProductCard> in Home)
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
export const DESIGNER = { name: "Designer", initials: "🎨", color: "#e8912d" };
export const DEVELOPER = { name: "Developer", initials: "💻", color: "#2bac76" };
export const PM = { name: "PM", initials: "PM", color: "#6b7280" };
export const CHANNEL = "design-feedback";
