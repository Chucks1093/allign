"use client";

import { useEffect, useRef } from "react";

export function GradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let frame: number;
    let time = 0;

    const animate = () => {
      time += 0.012;
      const s  = Math.sin(time);
      const s2 = Math.sin(time * 0.6 + 1.5);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      // top — always near black
      gradient.addColorStop(0,   `hsl(222, 40%, 3%)`);
      gradient.addColorStop(0.5, `hsl(222, 55%, ${6 + s * 2}%)`);
      // bottom blue — visibly pulses
      gradient.addColorStop(0.78, `hsl(220, 80%, ${18 + s2 * 7}%)`);
      gradient.addColorStop(1,    `hsl(218, 90%, ${28 + s  * 8}%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      frame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
