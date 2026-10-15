import { coverage, NODE_COVERAGE } from "./coverage.js";

export default async function globalTeardown() {
  if (!process.env.COVERAGE) return;
  const report = coverage();
  await report.addFromDir(NODE_COVERAGE);
  await report.generate();
}
