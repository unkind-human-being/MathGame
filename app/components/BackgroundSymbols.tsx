"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type FloatingItem = {
  type: "symbol" | "shape";
  symbol?: string;
  shape?: string;
  size: number;
  left: number;
  top: number;
  color: string;
  duration: number;
  delay: number;
  rotation: number;
  blur: number;
};

export default function FloatingMathBackground() {
  const SYMBOLS = ["+", "-", "×", "÷", "%", "√", "π", "∑", "∞", "/", "≠", "≈", "<", ">", "±", "⊗", "∫"];
  const SHAPES = ["circle", "triangle", "square", "hexagon"];
  const COLORS = ["#00FFA3", "#14B8FF", "#FF6AD5", "#FFE55C", "#7BFFB2", "#C084FC", "#FF8A8A", "#5AF4F9"];

  const TOTAL = 95;

  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    const data: FloatingItem[] = Array.from({ length: TOTAL }).map(() => {
      const isSymbol = Math.random() > 0.45;

      return {
        type: isSymbol ? "symbol" : "shape",
        symbol: isSymbol ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : undefined,
        shape: !isSymbol ? SHAPES[Math.floor(Math.random() * SHAPES.length)] : undefined,
        size: 20 + Math.random() * 70,
        left: Math.random() * 100,
        top: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        duration: 6 + Math.random() * 12,
        delay: Math.random() * 4,
        rotation: Math.random() * 360,
        blur: Math.random() * 2,
      } satisfies FloatingItem; // ⭐ TYPE-SAFE!
    });

    setItems(data);
  }, []);

  return (
    <div className="absolute inset-0 select-none overflow-hidden pointer-events-none z-0">
      {items.map((item, i) => (
        <motion.div
          key={i}
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            fontSize: item.size,
            fontWeight: 900,
            color: item.color,
            textShadow: `0 0 20px ${item.color}, 0 0 35px ${item.color}`,
            position: "absolute",
            filter: `blur(${item.blur}px)`,
          }}
          animate={{
            x: [0, 25, 0],
            y: [0, -25, 0],
            rotate: [item.rotation, item.rotation + 360],
            opacity: [0.3, 1, 0.4],
            scale: [0.9, 1.3, 1],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* 🔥 Symbol Rendering */}
          {item.type === "symbol" && item.symbol}

          {/* 🔥 Shape Rendering */}
          {item.type === "shape" && item.shape === "circle" && (
            <div className="rounded-full" style={{ width: item.size, height: item.size, background: item.color }} />
          )}

          {item.type === "shape" && item.shape === "square" && (
            <div style={{ width: item.size, height: item.size, background: item.color, borderRadius: 8 }} />
          )}

          {item.type === "shape" && item.shape === "triangle" && (
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: `${item.size / 2}px solid transparent`,
                borderRight: `${item.size / 2}px solid transparent`,
                borderBottom: `${item.size}px solid ${item.color}`,
              }}
            />
          )}

          {item.type === "shape" && item.shape === "hexagon" && (
            <div
              style={{
                width: item.size,
                height: item.size,
                background: item.color,
                clipPath:
                  "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)",
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
