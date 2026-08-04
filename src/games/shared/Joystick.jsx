export default function Joystick({ joystick, size = 96, color = "var(--pastel-blue)" }) {
  const { baseRef, nub, onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = joystick;
  return (
    <div
      ref={baseRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.55)",
        border: "2px solid rgba(255,255,255,0.8)",
        touchAction: "none",
        position: "relative",
        flex: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: size * 0.44,
          height: size * 0.44,
          borderRadius: "50%",
          background: color,
          boxShadow: "var(--shadow-sticker-sm)",
          transform: `translate(calc(-50% + ${nub.x}px), calc(-50% + ${nub.y}px))`,
        }}
      />
    </div>
  );
}
