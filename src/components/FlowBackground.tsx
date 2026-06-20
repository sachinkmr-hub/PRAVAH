import React from "react";

interface FlowBackgroundProps {
  speedMultiplier?: number;
  theme?: "light" | "dark";
}

export const FlowBackground: React.FC<FlowBackgroundProps> = ({ theme = "light" }) => {
  const isDark = theme === "dark";

  return (
    <div
      className="fixed inset-0 -z-20 pointer-events-none"
      aria-hidden="true"
      style={{
        backgroundImage: [
          isDark
            ? "linear-gradient(rgba(3, 8, 18, 0.72), rgba(3, 8, 18, 0.72))"
            : "linear-gradient(rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02))",
          "url('/pravah-reference-background.png')",
        ].join(", "),
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        filter: isDark ? "saturate(1.08) contrast(1.04)" : "none",
      }}
    />
  );
};
