// The mouse pointer, and a ring where it clicks. `press` is 0..1 around a click.
export function Cursor({ x, y, press = 0, ring = 0 }) {
  return (
    <>
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: x - 18,
            top: y - 18,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: "2px solid rgba(0,0,0,.35)",
            opacity: 1 - ring,
            transform: `scale(${0.4 + ring})`,
            zIndex: 1000,
          }}
        />
      )}
      <svg
        width="22"
        height="30"
        viewBox="0 0 22 30"
        style={{
          position: "absolute",
          left: x - 3,
          top: y - 2,
          zIndex: 1001,
          transform: `scale(${1 - press * 0.15})`,
          transformOrigin: "3px 2px",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))",
        }}
        aria-hidden="true"
      >
        <path
          d="M3 2v22l5.5-5.2 3.6 8.4 3.6-1.6-3.6-8.2H20z"
          fill="#000"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}
