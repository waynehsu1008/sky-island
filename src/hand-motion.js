export class HandMotion {
  constructor() { this.time = 0; this.swing = 0; this.placeRemaining = 0; }
  place() { this.placeRemaining = 0.3; }
  update(delta, { active = false, mining = false, walking = false } = {}) {
    const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.1)) : 0;
    if (!active) {
      this.swing = 0; this.placeRemaining = 0;
      return { visible: false, action: 'idle', x: 0, y: 0, z: 0, rx: 0, rz: 0 };
    }
    this.time += dt;
    this.placeRemaining = Math.max(0, this.placeRemaining - dt);
    this.swing = mining ? this.swing + dt * 2.6 : 0;
    const placing = this.placeRemaining > 0;
    const strike = mining ? Math.sin((this.swing % 1) * Math.PI) ** 2
      : placing ? Math.sin((1 - this.placeRemaining / 0.3) * Math.PI) : 0;
    return { visible: true, action: mining ? 'mining' : placing ? 'placing' : walking ? 'walking' : 'idle',
      x: -0.12 * strike, y: 0.055 * strike + (walking ? Math.sin(this.time * 9) * 0.012 : 0),
      z: -0.12 * strike, rx: strike ? (mining ? -0.8 : -0.4) * strike : 0, rz: 0.3 * strike };
  }
}
