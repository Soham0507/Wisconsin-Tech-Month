import { useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { WISCONSIN_POLYGON } from "./wisconsin-outline";

type Props = {
  headline: string;
  subhead: string;
  ctaLabel: string;
  onCtaClick?: () => void;
};

export function WovenLightHero({ headline, subhead, ctaLabel, onCtaClick }: Props) {
  const textControls = useAnimation();
  const buttonControls = useAnimation();

  useEffect(() => {
    textControls.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08 + 0.4,
        duration: 1.0,
        ease: [0.2, 0.65, 0.3, 0.9],
      },
    }));
    buttonControls.start({
      opacity: 1,
      transition: { delay: 1.4, duration: 0.9 },
    });
  }, [textControls, buttonControls]);

  const words = headline.split(" ");

  return (
    <section className="relative isolate h-[92vh] min-h-[620px] w-full overflow-hidden border-b border-border/50 bg-background">
      <WovenCanvas />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />
      <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-[88px]">
          {words.map((word, i) => {
            const isLastWord = i === words.length - 1;
            return (
              <span key={i} className={`mr-[0.25em] inline-block ${isLastWord ? "text-primary" : ""}`}>
                {word.split("").map((char, j) => (
                  <motion.span
                    key={j}
                    custom={i * 6 + j}
                    initial={{ opacity: 0, y: 24 }}
                    animate={textControls}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
            );
          })}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="mx-auto mt-6 max-w-2xl text-base text-foreground/85 [text-shadow:0_1px_12px_rgb(0_0_0_/_0.65)] sm:text-lg"
        >
          {subhead}
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={buttonControls} className="pointer-events-auto mt-9">
          <button
            type="button"
            onClick={onCtaClick}
            className="group inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-7 py-3 font-mono text-[11px] uppercase tracking-widest text-primary backdrop-blur-md transition-all hover:border-primary hover:bg-primary/20 hover:shadow-[0_0_40px_-8px_var(--color-primary)]"
          >
            {ctaLabel}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </motion.div>

        <p className="pointer-events-none mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
          drag to explore
        </p>
      </div>
    </section>
  );
}

// Ray-cast point-in-polygon test.
function pointInPolygon(x: number, y: number, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function buildWisconsinPoints(targetCount: number) {
  // Project lon/lat to a plane with a cos(lat) correction so the state isn't
  // horizontally stretched, then center and uniformly scale so the tallest
  // axis fits the target world size.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const [lon, lat] of WISCONSIN_POLYGON) {
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  const latCenter = (minY + maxY) / 2;
  const lonScale = Math.cos((latCenter * Math.PI) / 180);
  for (const [lon] of WISCONSIN_POLYGON) {
    const px = lon * lonScale;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
  }
  const projW = maxX - minX;
  const projH = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const targetHalf = 3.15; // half-size of the largest axis in world units
  const uniform = (targetHalf * 2) / Math.max(projW, projH);
  const norm = (lon: number, lat: number): [number, number] => {
    const px = lon * lonScale - cx;
    const py = lat - cy;
    return [px * uniform, py * uniform];
  };

  const outline: Array<[number, number]> = [];
  const outlineDensity = 58;
  for (let i = 0; i < WISCONSIN_POLYGON.length - 1; i++) {
    const [x0, y0] = WISCONSIN_POLYGON[i];
    const [x1, y1] = WISCONSIN_POLYGON[i + 1];
    for (let t = 0; t < outlineDensity; t++) {
      const k = t / outlineDensity;
      outline.push([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
    }
  }

  const fill: Array<[number, number]> = [];
  const targetFill = Math.max(targetCount - outline.length, 0);
  const lonW = maxLon - minLon;
  const latH = maxY - minY;
  let attempts = 0;
  const maxAttempts = targetFill * 12;
  while (fill.length < targetFill && attempts < maxAttempts) {
    attempts++;
    const rx = minLon + Math.random() * lonW;
    const ry = minY + Math.random() * latH;
    if (pointInPolygon(rx, ry, WISCONSIN_POLYGON)) {
      fill.push([rx, ry]);
    }
  }


  const all = outline.concat(fill);
  const positions = new Float32Array(all.length * 3);
  const boundaryPositions = new Float32Array(outline.length * 3);
  const outlinePositions = new Float32Array(outline.length * 3);
  for (let i = 0; i < outline.length; i++) {
    const [nx, ny] = norm(outline[i][0], outline[i][1]);
    boundaryPositions[i * 3] = nx;
    boundaryPositions[i * 3 + 1] = ny;
    boundaryPositions[i * 3 + 2] = 0.08;
    outlinePositions[i * 3] = nx;
    outlinePositions[i * 3 + 1] = ny;
    outlinePositions[i * 3 + 2] = 0.12;
  }
  for (let i = 0; i < all.length; i++) {
    const [nx, ny] = norm(all[i][0], all[i][1]);
    positions[i * 3] = nx;
    positions[i * 3 + 1] = ny;
    // Small depth so it feels 3D when rotating.
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.18;
  }
  return { positions, boundaryPositions, outlinePositions, count: all.length, outlineCount: outline.length };
}

function WovenCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = () => mount.clientWidth || window.innerWidth;
    const height = () => mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width() / height(), 0.1, 100);
    const cameraZFor = (w: number) => (w < 768 ? 9 : 6.9);
    camera.position.set(0, 0, cameraZFor(width()));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width(), height());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cursor = "grab";
    // Allow vertical page scroll over the canvas on touch devices.
    renderer.domElement.style.touchAction = "pan-y";
    mount.appendChild(renderer.domElement);

    // Wisconsin-shaped particle cloud.
    const { positions, boundaryPositions, outlinePositions, count, outlineCount } = buildWisconsinPoints(7600);
    const colors = new Float32Array(count * 3);
    const paletteHSL: Array<[number, number, number]> = [
      [0.5, 0.85, 0.55],
      [0.55, 0.7, 0.65],
      [0.62, 0.6, 0.6],
    ];
    for (let i = 0; i < count; i++) {
      const [h, s, l] = i < outlineCount ? [0.49, 0.95, 0.7] : paletteHSL[i % paletteHSL.length];
      const c = new THREE.Color().setHSL(h, s, l);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Preserve home positions + per-vertex velocity for the explode/reform effect.
    const homePositions = positions.slice();
    const velocities = new Float32Array(count * 3);

    const material = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    // Face the camera; Wisconsin's long axis vertical.
    scene.add(points);

    // Outline layers removed — interior fill only.
    void outlinePositions;
    void boundaryPositions;

    // Background starfield for depth — denser layered stars behind the state.
    const makeStars = (n: number, spread: number, depthMin: number, depthMax: number, size: number, opacity: number) => {
      const g = new THREE.BufferGeometry();
      const p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        p[i * 3] = (Math.random() - 0.5) * spread;
        p[i * 3 + 1] = (Math.random() - 0.5) * spread;
        p[i * 3 + 2] = -depthMin - Math.random() * (depthMax - depthMin);
      }
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      const m = new THREE.PointsMaterial({
        size,
        color: 0xffffff,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(g, m);
      scene.add(pts);
      return { g, m, pts };
    };
    const starFar = makeStars(1400, 60, 18, 38, 0.035, 0.5);
    const starMid = makeStars(600, 40, 10, 20, 0.05, 0.7);
    const starNear = makeStars(180, 28, 6, 12, 0.075, 0.85);


    // OrbitControls: drag to rotate.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.autoRotate = !prefersReducedMotion;
    controls.autoRotateSpeed = 0.6;
    // Touch: one-finger rotate, two-finger rotate (no zoom/pan).
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.ROTATE };

    // Gesture-intent: on touch devices, watch the first bit of movement.
    // Mostly-vertical single-finger drags become page scrolls (disable
    // controls for that gesture). Horizontal drags or two-finger touches
    // become rotate gestures (lock scroll for that gesture).
    let touchStartX = 0;
    let touchStartY = 0;
    let touchIntent: "unknown" | "scroll" | "rotate" = "unknown";
    const INTENT_THRESHOLD = 8; // px
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        touchIntent = "rotate";
        renderer.domElement.style.touchAction = "none";
        controls.enabled = true;
        return;
      }
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchIntent = "unknown";
      // Default: allow vertical page scroll; keep controls off until we
      // know the user wants to rotate.
      renderer.domElement.style.touchAction = "pan-y";
      controls.enabled = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchIntent !== "unknown") return;
      if (e.touches.length >= 2) {
        touchIntent = "rotate";
        renderer.domElement.style.touchAction = "none";
        controls.enabled = true;
        return;
      }
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - touchStartX);
      const dy = Math.abs(t.clientY - touchStartY);
      if (dx < INTENT_THRESHOLD && dy < INTENT_THRESHOLD) return;
      if (dx > dy) {
        touchIntent = "rotate";
        renderer.domElement.style.touchAction = "none";
        controls.enabled = true;
      } else {
        touchIntent = "scroll";
        // Leave controls disabled; browser handles the vertical scroll.
      }
    };
    const onTouchEnd = () => {
      touchIntent = "unknown";
      renderer.domElement.style.touchAction = "pan-y";
      controls.enabled = true;
    };
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: true });
    renderer.domElement.addEventListener("touchend", onTouchEnd);
    renderer.domElement.addEventListener("touchcancel", onTouchEnd);

    const onStart = () => {
      controls.autoRotate = false;
      renderer.domElement.style.cursor = "grabbing";
    };
    const onEnd = () => {
      controls.autoRotate = !prefersReducedMotion;
      renderer.domElement.style.cursor = "grab";
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);

    // Cursor tracking for explode/reform effect.
    const pointer = new THREE.Vector2();
    let pointerActive = false;
    const raycaster = new THREE.Raycaster();
    const cursorWorld = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerActive = true;
    };
    const clearPointer = () => {
      pointerActive = false;
    };
    renderer.domElement.addEventListener("pointermove", updatePointer);
    renderer.domElement.addEventListener("pointerleave", clearPointer);

    const REPEL_RADIUS = 0.9;
    const REPEL_STRENGTH = 0.06;
    const SPRING = 0.045;
    const DAMPING = 0.86;
    const tmpLocal = new THREE.Vector3();
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();

      // Project cursor onto the z=0 plane in world space, then convert to
      // the points' local space so it works while the mesh is rotated.
      let hasCursor = false;
      if (pointerActive) {
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(plane, cursorWorld)) {
          points.worldToLocal(tmpLocal.copy(cursorWorld));
          hasCursor = true;
        }
      }

      const arr = posAttr.array as Float32Array;
      const r2 = REPEL_RADIUS * REPEL_RADIUS;
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const iy = ix + 1;
        const iz = ix + 2;
        if (hasCursor) {
          const dx = arr[ix] - tmpLocal.x;
          const dy = arr[iy] - tmpLocal.y;
          const dz = arr[iz] - tmpLocal.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < r2 && d2 > 0.0001) {
            const falloff = 1 - d2 / r2;
            const inv = REPEL_STRENGTH * falloff / Math.sqrt(d2);
            velocities[ix] += dx * inv;
            velocities[iy] += dy * inv;
            velocities[iz] += dz * inv;
          }
        }
        // Spring back toward home + damping.
        velocities[ix] += (homePositions[ix] - arr[ix]) * SPRING;
        velocities[iy] += (homePositions[iy] - arr[iy]) * SPRING;
        velocities[iz] += (homePositions[iz] - arr[iz]) * SPRING;
        velocities[ix] *= DAMPING;
        velocities[iy] *= DAMPING;
        velocities[iz] *= DAMPING;
        arr[ix] += velocities[ix];
        arr[iy] += velocities[iy];
        arr[iz] += velocities[iz];
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = width();
      const h = height();
      camera.aspect = w / h;
      camera.position.z = cameraZFor(w);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", updatePointer);
      renderer.domElement.removeEventListener("pointerleave", clearPointer);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.domElement.removeEventListener("touchcancel", onTouchEnd);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      starFar.g.dispose();
      starFar.m.dispose();
      starMid.g.dispose();
      starMid.m.dispose();
      starNear.g.dispose();
      starNear.m.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
}
