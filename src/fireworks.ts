import * as THREE from 'three';

type Spark = { x: number; y: number; speed: number; life: number; size: number; color: THREE.Color };
type Firework = { x: number; y: number; radius: number; age: number; flight: number; drift: number; sparks: Spark[]; color: THREE.Color };
const MAX_POINTS = 2400;
const TRAIL_STEPS = 7;
const COLORS = ['#ffd996', '#ffb6cd', '#b8c8ff', '#bfe8de'];
const range = (min: number, max: number) => min + Math.random() * (max - min);

/** A small, bounded particle pool, placed in camera space behind the park. */
export function createFireworks(camera: THREE.OrthographicCamera) {
  const positions = new Float32Array(MAX_POINTS * 3);
  const colors = new Float32Array(MAX_POINTS * 3);
  const sizes = new Float32Array(MAX_POINTS);
  const alphas = new Float32Array(MAX_POINTS);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('sparkColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('sparkSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('sparkAlpha', new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { pixelRatio: { value: 1 } },
    vertexShader: `
      attribute vec3 sparkColor;
      attribute float sparkSize;
      attribute float sparkAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float pixelRatio;
      void main() {
        vColor = sparkColor;
        vAlpha = sparkAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = sparkSize * pixelRatio;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
        if (radius > 1.0) discard;
        float glow = exp(-radius * radius * 4.5) * (1.0 - smoothstep(0.6, 1.0, radius));
        gl_FragColor = vec4(vColor, glow * vAlpha);
        #include <colorspace_fragment>
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  camera.add(points);
  let fireworks: Firework[] = [];
  let countdown = .55;
  let wasEnabled = false;

  function launch(width: number, height: number) {
    const portrait = width / height < 1;
    const radius = Math.min(90, Math.max(29, width * range(.044, .07)));
    const color = new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]);
    const count = Math.floor(range(58, 77));
    const sparks: Spark[] = [];
    for (let i = 0; i < count; i++) {
      // A ring of long trails surrounds a softer, scattered inner burst.
      const angle = i / count * Math.PI * 2 + range(-.035, .035);
      const speed = i % 3 === 0 ? range(.38, .72) : range(.85, 1.05);
      sparks.push({ x: Math.cos(angle), y: Math.sin(angle), speed, life: range(2.5, 3.4), size: range(3.5, 5.3), color: color.clone().lerp(new THREE.Color('#fff5d8'), range(0, .34)) });
    }
    fireworks.push({
      x: portrait ? range(.2, .8) : range(.52, .86),
      y: portrait ? range(.2, .31) : Math.max(range(.10, .17), (radius + 18) / height),
      radius, age: 0, flight: range(.85, 1.3), drift: range(-18, 18), sparks, color,
    });
  }

  return {
    update(dt: number, enabled: boolean, nightAmount: number, reducedMotion: boolean, width: number, height: number, pixelRatio: number) {
      const show = enabled && !reducedMotion;
      if (!show) {
        fireworks = [];
        countdown = .55;
        wasEnabled = false;
        geometry.setDrawRange(0, 0);
        points.visible = false;
        return;
      }
      if (!wasEnabled) { countdown = .55; wasEnabled = true; }
      if (nightAmount < .7) return;
      countdown -= dt;
      if (countdown <= 0 && fireworks.length < 3) {
        launch(width, height);
        countdown = range(2.2, 4.1);
      }
      let index = 0;
      const worldPerPixelX = (camera.right - camera.left) / width;
      const worldPerPixelY = (camera.top - camera.bottom) / height;
      material.uniforms.pixelRatio.value = pixelRatio;
      function put(x: number, y: number, size: number, alpha: number, color: THREE.Color) {
        if (index >= MAX_POINTS || alpha <= .005) return;
        const offset = index * 3;
        positions[offset] = camera.left + x * worldPerPixelX;
        positions[offset + 1] = camera.top - y * worldPerPixelY;
        positions[offset + 2] = -95;
        colors[offset] = color.r;
        colors[offset + 1] = color.g;
        colors[offset + 2] = color.b;
        sizes[index] = size;
        alphas[index] = alpha * nightAmount;
        index++;
      }
      for (const firework of fireworks) {
        firework.age += dt;
        const x = firework.x * width;
        const y = firework.y * height;
        if (firework.age < firework.flight) {
          const progress = firework.age / firework.flight;
          for (let tail = 0; tail < 16; tail++) {
            const t = Math.max(0, progress - tail * .017);
            const remaining = (1 - t) ** 1.4;
            put(x + firework.drift * remaining, y + firework.radius * 1.9 * remaining, tail ? 2.6 : 5, (1 - tail / 16) * .75, firework.color);
          }
          continue;
        }
        const age = firework.age - firework.flight;
        const unfold = Math.min(1, age / .14);
        // A gentle central glow, without full-screen flashes.
        if (age < .45) put(x, y, 22, (1 - age / .45) * .22, firework.color);
        for (const spark of firework.sparks) {
          if (age >= spark.life) continue;
          const fade = (1 - age / spark.life) ** 1.2 * unfold;
          for (let tail = 0; tail < TRAIL_STEPS; tail++) {
            const t = Math.max(0, age - tail * .048);
            const spread = (1 - Math.exp(-t * 1.35)) * firework.radius * spark.speed;
            const fall = t * t * firework.radius * .095;
            put(x + spark.x * spread, y + spark.y * spread + fall, spark.size * (1 - tail * .11), fade * (1 - tail / TRAIL_STEPS) * 1.7, spark.color);
          }
        }
      }
      fireworks = fireworks.filter(firework => firework.age < firework.flight + 3.5);
      geometry.setDrawRange(0, index);
      for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
      points.visible = index > 0;
    },
    dispose() { fireworks = []; camera.remove(points); geometry.dispose(); material.dispose(); },
  };
}
