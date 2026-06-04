export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pointer = { active: false, x: 0, y: 0 };

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "p", "r", "e", "shift", "b"].includes(key)) {
        event.preventDefault();
      }
      this.keys.add(key);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    const updatePointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches?.[0] ?? event.changedTouches?.[0] ?? event;
      this.pointer.x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      this.pointer.y = ((touch.clientY - rect.top) / rect.height) * canvas.height;
    };

    canvas.addEventListener("pointerdown", (event) => {
      this.pointer.active = true;
      canvas.setPointerCapture?.(event.pointerId);
      updatePointer(event);
    });
    canvas.addEventListener("pointermove", updatePointer);
    canvas.addEventListener("pointerup", () => {
      this.pointer.active = false;
    });
    canvas.addEventListener("pointercancel", () => {
      this.pointer.active = false;
    });
    canvas.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) y -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) y += 1;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }
}
