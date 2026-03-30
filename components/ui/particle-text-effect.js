"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

class Particle {
  constructor() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };

    this.closeEnoughTarget = 100;
    this.maxSpeed = 1.0;
    this.maxForce = 0.1;
    this.particleSize = 10;
    this.isKilled = false;

    this.startColor = { r: 0, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;
    this.colorBlendRate = 0.01;
  }

  move(mouse) {
    // 1. Target Attraction (기존 로직)
    let proximityMult = 1;
    const distanceToTarget = Math.sqrt(
      Math.pow(this.pos.x - this.target.x, 2) + 
      Math.pow(this.pos.y - this.target.y, 2)
    );

    if (distanceToTarget < this.closeEnoughTarget) {
      proximityMult = distanceToTarget / this.closeEnoughTarget;
    }

    const towardsTarget = {
      x: this.target.x - this.pos.x,
      y: this.target.y - this.pos.y,
    };

    const targetMagnitude = Math.sqrt(towardsTarget.x * towardsTarget.x + towardsTarget.y * towardsTarget.y);
    if (targetMagnitude > 0) {
      towardsTarget.x = (towardsTarget.x / targetMagnitude) * this.maxSpeed * proximityMult;
      towardsTarget.y = (towardsTarget.y / targetMagnitude) * this.maxSpeed * proximityMult;
    }

    const steer = {
      x: towardsTarget.x - this.vel.x,
      y: towardsTarget.y - this.vel.y,
    };

    const steerMagnitude = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
    if (steerMagnitude > 0) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce;
      steer.y = (steer.y / steerMagnitude) * this.maxForce;
    }

    this.acc.x += steer.x;
    this.acc.y += steer.y;

    // 2. Mouse Repulsion (마우스 척력 효과 추가)
    if (mouse && !this.isKilled) {
      const dx = this.pos.x - mouse.x;
      const dy = this.pos.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      const mouseRadius = 100; // 영향 반경
      const mouseRadiusSq = mouseRadius * mouseRadius;

      if (distSq < mouseRadiusSq) {
        const dist = Math.sqrt(distSq);
        const force = (mouseRadius - dist) / mouseRadius;
        const repelPower = 8.0; // 척력 강도

        this.acc.x += (dx / dist) * force * repelPower;
        this.acc.y += (dy / dist) * force * repelPower;
      }
    }

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    
    // Friction (감속)
    this.vel.x *= 0.95;
    this.vel.y *= 0.95;

    this.acc.x = 0;
    this.acc.y = 0;
  }

  draw(ctx, drawAsPoints) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0);
    }

    const currentColor = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
    };

    const colorStr = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;

    if (drawAsPoints) {
      ctx.fillStyle = colorStr;
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    } else {
      ctx.fillStyle = colorStr;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  kill(width, height) {
    if (!this.isKilled) {
      const randomPos = this.generateRandomPos(width / 2, height / 2, (width + height) / 2);
      this.target.x = randomPos.x;
      this.target.y = randomPos.y;

      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      };
      // target color back to invisible effectively, just pick 0,0,0
      this.targetColor = { r: 0, g: 0, b: 0 };
      this.colorWeight = 0;

      this.isKilled = true;
    }
  }

  generateRandomPos(x, y, mag) {
    const randomX = Math.random() * 1000;
    const randomY = Math.random() * 500;

    const direction = {
      x: randomX - x,
      y: randomY - y,
    };

    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (magnitude > 0) {
      direction.x = (direction.x / magnitude) * mag;
      direction.y = (direction.y / magnitude) * mag;
    }

    return {
      x: x + direction.x,
      y: y + direction.y,
    };
  }
}

const DEFAULT_WORDS = ["안녕하세요.", "당신을 위한", "모든 마케팅을", "제공하겠습니다.", "GIVENEEDS입니다."];

const COLOR_PALETTE = [
  { r: 56, g: 189, b: 248 },  // Sky 400
  { r: 2, g: 132, b: 199 },   // Sky 600
  { r: 37, g: 99, b: 235 },   // Blue 600
  { r: 29, g: 161, b: 242 },  // Twitter Blue
  { r: 34, g: 197, b: 94 },   // Green 500
  { r: 22, g: 163, b: 74 },   // Green 600
  { r: 16, g: 185, b: 129 },  // Emerald 500
];

export function ParticleTextEffect({ words = DEFAULT_WORDS }) {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef([]);
  const frameCountRef = useRef(0);
  const wordIndexRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, isPressed: false, isRightClick: false });

  const { theme } = useTheme();
  // Safe default to dark if not loaded yet
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(theme === 'light');
  }, [theme]);

  const drawAsPoints = true;
  // pixelSteps는 useEffect 내에서만 사용되어 SSR 오류 방지

  const generateRandomPos = (x, y, mag) => {
    const randomX = Math.random() * 1000;
    const randomY = Math.random() * 500;

    const direction = {
      x: randomX - x,
      y: randomY - y,
    };

    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (magnitude > 0) {
      direction.x = (direction.x / magnitude) * mag;
      direction.y = (direction.y / magnitude) * mag;
    }

    return {
      x: x + direction.x,
      y: y + direction.y,
    };
  };

  const nextWord = (word, canvas, isLightMode) => {
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d");

    offscreenCtx.fillStyle = "white";
    const fontSize = Math.min(canvas.width / 10, canvas.height / 5, window.innerWidth < 768 ? 60 : 100);
    // Canvas API는 CSS 변수를 지원하지 않으므로 실제 폰트명을 직접 사용
    offscreenCtx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    offscreenCtx.textAlign = "center";
    offscreenCtx.textBaseline = "middle";
    offscreenCtx.fillText(word, canvas.width / 2, canvas.height / 2);

    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    // ... rest of the function (I will keep the logic same)
    const paletteColor = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    
    const newColor = isLightMode ? {
      r: Math.max(0, paletteColor.r - 40),
      g: Math.max(0, paletteColor.g - 40),
      b: Math.max(0, paletteColor.b - 40),
    } : {
      r: Math.min(255, paletteColor.r + 40),
      g: Math.min(255, paletteColor.g + 40),
      b: Math.min(255, paletteColor.b + 40),
    };

    const particles = particlesRef.current;
    let particleIndex = 0;

    const pixelSteps = window.innerWidth < 768 ? 4 : 6;
    const coordsIndexes = [];
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) {
      coordsIndexes.push(i);
    }

    for (let i = coordsIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [coordsIndexes[i], coordsIndexes[j]] = [coordsIndexes[j], coordsIndexes[i]];
    }

    for (const coordIndex of coordsIndexes) {
      const pixelIndex = coordIndex;
      const alpha = pixels[pixelIndex + 3];

      if (alpha > 0) {
        const x = (pixelIndex / 4) % canvas.width;
        const y = Math.floor(pixelIndex / 4 / canvas.width);

        let particle;

        if (particleIndex < particles.length) {
          particle = particles[particleIndex];
          particle.isKilled = false;
          particleIndex++;
        } else {
          particle = new Particle();

          const randomPos = generateRandomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2);
          particle.pos.x = randomPos.x;
          particle.pos.y = randomPos.y;

          particle.maxSpeed = Math.random() * 6 + 4;
          particle.maxForce = particle.maxSpeed * 0.05;
          particle.particleSize = Math.random() * 6 + 6;
          particle.colorBlendRate = Math.random() * 0.0275 + 0.0025;

          particles.push(particle);
        }

        particle.startColor = {
          r: particle.startColor.r + (particle.targetColor.r - particle.startColor.r) * particle.colorWeight,
          g: particle.startColor.g + (particle.targetColor.g - particle.startColor.g) * particle.colorWeight,
          b: particle.startColor.b + (particle.targetColor.b - particle.startColor.b) * particle.colorWeight,
        };
        particle.targetColor = newColor;
        particle.colorWeight = 0;

        particle.target.x = x;
        particle.target.y = y;
      }
    }

    for (let i = particleIndex; i < particles.length; i++) {
      particles[i].kill(canvas.width, canvas.height);
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext("2d");
    const particles = particlesRef.current;

    const isDocLight = !document.documentElement.classList.contains('dark');

    ctx.fillStyle = isDocLight ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.move(mouseRef.current);
      particle.draw(ctx, drawAsPoints);

      if (particle.isKilled) {
        if (
          particle.pos.x < 0 ||
          particle.pos.x > canvas.width ||
          particle.pos.y < 0 ||
          particle.pos.y > canvas.height
        ) {
          particles.splice(i, 1);
        }
      }
    }

    if (mouseRef.current.isPressed && mouseRef.current.isRightClick) {
      particles.forEach((particle) => {
        const distance = Math.sqrt(
          Math.pow(particle.pos.x - mouseRef.current.x, 2) + Math.pow(particle.pos.y - mouseRef.current.y, 2),
        );
        if (distance < 50) {
          particle.kill(canvas.width, canvas.height);
        }
      });
    }

    frameCountRef.current++;
    if (frameCountRef.current % 180 === 0) {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
      nextWord(words[wordIndexRef.current], canvas, isDocLight);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      const w = parent && parent.offsetWidth > 0 ? parent.offsetWidth : window.innerWidth;
      const h = parent && parent.offsetHeight > 0 ? parent.offsetHeight : window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      if (canvas.width > 0 && canvas.height > 0) {
        nextWord(words[wordIndexRef.current], canvas, !document.documentElement.classList.contains('dark'));
      }
    };

    window.addEventListener('resize', resizeCanvas);

    // 폰트가 완전히 로드된 후에 캔버스 초기화 (폰트 미로딩 시 픽셀 감지 불가)
    document.fonts.ready.then(() => {
      resizeCanvas();
      animate();
    });

    const handleMouseDown = (e) => {
      mouseRef.current.isPressed = true;
      mouseRef.current.isRightClick = e.button === 2;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseUp = () => {
      mouseRef.current.isPressed = false;
      mouseRef.current.isRightClick = false;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []); 

  useEffect(() => {
    if (canvasRef.current && canvasRef.current.width > 0 && canvasRef.current.height > 0) {
      nextWord(words[wordIndexRef.current], canvasRef.current, isLight);
    }
  }, [isLight]);


  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
