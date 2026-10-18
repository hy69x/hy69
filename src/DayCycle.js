// ─────────────────────────────────────────────────────────────
//  DayCycle — derives scene lighting from the real clock time
// ─────────────────────────────────────────────────────────────

export class DayCycle {
  constructor() {
    this.update();
  }

  /** Returns a 0–1 float representing progress through the day */
  get t() { return this._t; }

  update() {
    const now  = new Date();
    const h    = now.getHours() + now.getMinutes() / 60;
    this._t    = h / 24;          // 0 = midnight, 0.5 = noon
    this._hour = h;
    return this;
  }

  /** Sky top colour (horizon is lerped from this) */
  getSkyTop() {
    const h = this._hour;
    if (h < 5  || h >= 22) return { r: 0.02, g: 0.02, b: 0.08 }; // night
    if (h < 7)             return { r: 0.6,  g: 0.3,  b: 0.15 }; // dawn
    if (h < 9)             return { r: 0.6,  g: 0.75, b: 1.0  }; // early morning
    if (h < 17)            return { r: 0.38, g: 0.62, b: 1.0  }; // day
    if (h < 19)            return { r: 0.85, g: 0.45, b: 0.2  }; // golden hour
    if (h < 21)            return { r: 0.3,  g: 0.1,  b: 0.15 }; // dusk
    return                        { r: 0.04, g: 0.04, b: 0.12 }; // night
  }

  getSkyBottom() {
    const h = this._hour;
    if (h < 5  || h >= 22) return { r: 0.05, g: 0.05, b: 0.12 };
    if (h < 7)             return { r: 0.9,  g: 0.5,  b: 0.25 };
    if (h < 9)             return { r: 0.8,  g: 0.9,  b: 1.0  };
    if (h < 17)            return { r: 0.65, g: 0.85, b: 1.0  };
    if (h < 19)            return { r: 1.0,  g: 0.6,  b: 0.2  };
    if (h < 21)            return { r: 0.5,  g: 0.15, b: 0.2  };
    return                        { r: 0.06, g: 0.06, b: 0.14 };
  }

  getSunColor() {
    const h = this._hour;
    if (h < 5  || h >= 22) return { r: 0.15, g: 0.15, b: 0.4 }; // moonlight
    if (h < 7)             return { r: 1.0,  g: 0.5,  b: 0.2 }; // dawn orange
    if (h < 17)            return { r: 1.0,  g: 0.97, b: 0.88 }; // daylight
    if (h < 19)            return { r: 1.0,  g: 0.55, b: 0.15 }; // golden
    return                        { r: 0.5,  g: 0.15, b: 0.25 }; // dusk
  }

  getSunIntensity() {
    const h = this._hour;
    if (h < 5  || h >= 22) return 0.12;
    if (h < 7)             return 0.6;
    if (h < 9)             return 1.2;
    if (h < 17)            return 2.0;
    if (h < 19)            return 1.0;
    if (h < 21)            return 0.4;
    return 0.1;
  }

  getAmbientIntensity() {
    const h = this._hour;
    if (h < 5  || h >= 22) return 0.08;
    if (h < 7)             return 0.35;
    if (h < 17)            return 0.7;
    if (h < 19)            return 0.5;
    return 0.15;
  }

  getFogDensity() {
    const h = this._hour;
    if (h < 5  || h >= 22) return 0.015;
    if (h < 7  || h >= 20) return 0.009;
    return 0.005;
  }

  /** Human readable label + icon for the HUD */
  getLabel() {
    const h = this._hour;
    if (h < 5  || h >= 22) return { icon: '🌙', label: 'Night' };
    if (h < 7)             return { icon: '🌅', label: 'Dawn' };
    if (h < 12)            return { icon: '🌤', label: 'Morning' };
    if (h < 17)            return { icon: '☀️', label: 'Afternoon' };
    if (h < 19)            return { icon: '🌇', label: 'Golden Hour' };
    if (h < 21)            return { icon: '🌆', label: 'Dusk' };
    return                        { icon: '🌙', label: 'Night' };
  }

  /** Are we in night hours? */
  isNight() {
    return this._hour < 5.5 || this._hour >= 21.5;
  }
}
