import { coverage } from "./coverage.js";

export default async function globalTeardown() {
  if (process.env.COVERAGE) await coverage().generate();
}
