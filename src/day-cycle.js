export const DAY_SECONDS = 300;

export class DayCycle {
  constructor() { this.elapsed = 0; }
  update(delta, active = true) { if (active && Number.isFinite(delta) && delta > 0) this.elapsed += delta; }
  clock() {
    const totalSeconds = Math.floor(this.elapsed);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;
    const pad = value => String(value).padStart(2, '0');
    return { day: Math.floor(totalSeconds / DAY_SECONDS) + 1, totalSeconds,
      daySeconds: totalSeconds % DAY_SECONDS,
      text: `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}` };
  }
  sample(time = this.elapsed) {
    const phase = ((time % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS / DAY_SECONDS;
    const daylight = Math.max(0, Math.min(1, (Math.cos(phase * Math.PI * 2) + 1) / 2));
    const night = [0.07, 0.12, 0.22], day = [191 / 255, 224 / 255, 244 / 255];
    const sunset = Math.exp(-Math.pow((daylight - 0.35) / 0.15, 2)) * 0.3;
    const sky = day.map((v, i) => (night[i] + (v - night[i]) * daylight) * (1 - sunset) + [0.86, 0.51, 0.36][i] * sunset);
    return { phase, daylight, sky, ambient: 0.9 + 1.3 * daylight, sun: 0.15 + 1.45 * daylight,
      label: daylight < 0.18 ? '夜晚' : daylight > 0.65 ? '白天' : Math.sin(phase * Math.PI * 2) >= 0 ? '黃昏' : '清晨' };
  }
}
