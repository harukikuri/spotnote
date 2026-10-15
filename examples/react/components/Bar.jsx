// A text-free placeholder bar (Suspense-skeleton look) so demo recordings
// show layout only, no readable copy.
export default function Bar({ w = "100%", h = 12, dark = false }) {
  return <span className={"bar" + (dark ? " bar-dark" : "")} style={{ width: w, height: h }} />;
}
