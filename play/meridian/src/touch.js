// On-screen touch controls, so the game is playable on a phone or tablet.
//
// Every scene reads input through Phaser's keyboard plugin — `isDown`
// polling for movement, `JustDown` for interact/confirm, `once("keydown")`
// for the "hit any key" screens. Rather than teach each scene a second
// input path, these buttons synthesize the very keyboard events the game
// already listens for and dispatch them on `window`, which is where
// Phaser's KeyboardManager binds its listeners. Nothing in the game knows
// touch exists, and keyboard play is completely unaffected.
//
// The D-pad is one pad, not four buttons: direction comes from where your
// thumb is relative to the pad's center, so you can slide between
// directions mid-press and hit diagonals in the corners (movement reads
// two axes at once), the way a real thumb pad behaves.

const TOUCH_CONTROLS = (function () {
  // keyCode is what Phaser actually reads off the event (see
  // KeyboardPlugin.update); `key`/`code` are set to match a real keypress
  // so anything else inspecting the event sees a coherent one.
  const KEYS = {
    up: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
    down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
    left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
    right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
    space: { key: " ", code: "Space", keyCode: 32 },
    h: { key: "h", code: "KeyH", keyCode: 72 },
  };

  // Which synthetic keys are currently "down", so every press is
  // guaranteed a matching release — a keydown with no keyup would leave
  // Phaser polling `isDown === true` forever and the player walking into
  // a wall on their own.
  const held = new Set();

  const DIAGONAL_DEADZONE = 0.3; // fraction of pad radius that counts as "centered"

  // Eight sectors around the pad, starting at due right and going
  // clockwise (screen y grows downward), each listing the direction keys
  // it holds down. The four diagonal entries are what make it possible to
  // walk at 45 degrees.
  const OCTANTS = [
    ["right"],
    ["right", "down"],
    ["down"],
    ["down", "left"],
    ["left"],
    ["left", "up"],
    ["up"],
    ["up", "right"],
  ];

  function dispatchKey(type, name) {
    const def = KEYS[name];
    if (!def) return;
    const event = new KeyboardEvent(type, {
      key: def.key,
      code: def.code,
      bubbles: true,
      cancelable: true,
    });
    // keyCode is legacy and read-only on the prototype, and browsers
    // disagree about honoring it in the constructor's init dict — so
    // shadow it with an own property, which works everywhere.
    Object.defineProperty(event, "keyCode", { get: () => def.keyCode });
    Object.defineProperty(event, "which", { get: () => def.keyCode });
    window.dispatchEvent(event);
  }

  function press(name) {
    if (held.has(name)) return;
    held.add(name);
    dispatchKey("keydown", name);
  }

  function release(name) {
    if (!held.has(name)) return;
    held.delete(name);
    dispatchKey("keyup", name);
  }

  function releaseAll() {
    Array.from(held).forEach(release);
  }

  // Drives the pad toward exactly this set of directions, releasing
  // whatever else was held. Called on every pointermove, so it has to be
  // idempotent — press()/release() both no-op when already in that state,
  // which also keeps us from spamming duplicate events at Phaser.
  function setDirections(dirs) {
    ["up", "down", "left", "right"].forEach((dir) => {
      if (dirs.indexOf(dir) === -1) release(dir);
    });
    dirs.forEach(press);
  }

  function directionsFor(dx, dy, radius) {
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < radius * DIAGONAL_DEADZONE) return [];
    const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    return OCTANTS[((octant % 8) + 8) % 8];
  }

  function bindPad(pad, arrows) {
    let rect = null;

    function updateFrom(event) {
      if (!rect) return;
      const radius = Math.min(rect.width, rect.height) / 2;
      const dirs = directionsFor(
        event.clientX - (rect.left + rect.width / 2),
        event.clientY - (rect.top + rect.height / 2),
        radius
      );
      setDirections(dirs);
      Object.keys(arrows).forEach((dir) => {
        arrows[dir].classList.toggle("active", dirs.indexOf(dir) !== -1);
      });
    }

    function endPress() {
      rect = null;
      setDirections([]);
      Object.keys(arrows).forEach((dir) => arrows[dir].classList.remove("active"));
    }

    pad.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      // The pad doesn't move mid-press, so measuring once per press is
      // enough — and keeps pointermove off the layout-thrash path.
      rect = pad.getBoundingClientRect();
      // Capture so a thumb that slides past the pad's edge keeps steering
      // it instead of silently dropping the input.
      if (pad.setPointerCapture) pad.setPointerCapture(event.pointerId);
      updateFrom(event);
    });
    pad.addEventListener("pointermove", (event) => {
      if (!rect) return;
      event.preventDefault();
      updateFrom(event);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      pad.addEventListener(type, endPress);
    });
  }

  function bindButton(button, name) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.classList.add("active");
      press(name);
    });
    // Release on cancel/leave too, not just pointerup: sliding off a
    // button is a normal way to abort a press.
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      button.addEventListener(type, () => {
        button.classList.remove("active");
        release(name);
      });
    });
  }

  function primaryInputIsTouch() {
    return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  }

  function init() {
    const root = document.getElementById("touch-controls");
    const pad = document.getElementById("touch-dpad");
    if (!root || !pad) return;

    const arrows = {
      up: document.getElementById("touch-dpad-up"),
      down: document.getElementById("touch-dpad-down"),
      left: document.getElementById("touch-dpad-left"),
      right: document.getElementById("touch-dpad-right"),
    };
    if (Object.keys(arrows).some((dir) => !arrows[dir])) return;

    bindPad(pad, arrows);
    bindButton(document.getElementById("touch-btn-space"), "space");
    bindButton(document.getElementById("touch-btn-h"), "h");

    function show() {
      root.classList.add("visible");
    }

    // Devices whose *primary* pointer is touch get the controls up front.
    // A touchscreen laptop reports a fine pointer and shouldn't have a
    // D-pad sitting over the game it's playing with a keyboard — so those
    // only get the controls once the screen is actually touched.
    if (primaryInputIsTouch()) show();
    window.addEventListener("touchstart", show, { once: true, passive: true });

    // A press interrupted by the phone locking, a call, or an app switch
    // never sends its pointerup, which would strand a key down.
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) releaseAll();
    });

    // Browsers only allow audio to start from a user gesture, and the
    // title screen's beat is kicked off from the synthesized keydown —
    // one frame removed from the real touch. Nudging a suspended context
    // straight from the genuine gesture covers the stricter engines.
    document.addEventListener(
      "pointerdown",
      () => {
        if (window.MUSIC && MUSIC.ctx && MUSIC.ctx.state === "suspended") MUSIC.ctx.resume();
      },
      { passive: true }
    );
  }

  return { init, press, release, releaseAll };
})();

TOUCH_CONTROLS.init();
