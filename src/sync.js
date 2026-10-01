// Control ⇄ output windows sync.
// BroadcastChannel reaches every window of the same origin (http/https); direct
// postMessage to/from windows we opened covers file://, where origins are opaque.

const CHANNEL = 'pip-backgrounds';
const TAG = '__pipbg';

export function createSync(onMessage) {
  const sender = Math.random().toString(36).slice(2);
  let seq = 0;
  const lastSeen = new Map();
  const windows = new Set();

  const receive = (msg) => {
    if (!msg || !msg[TAG] || msg.sender === sender) return;
    // the same message can arrive through both transports
    if ((lastSeen.get(msg.sender) ?? -1) >= msg.seq) return;
    lastSeen.set(msg.sender, msg.seq);
    onMessage(msg);
  };

  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e) => receive(e.data);
  } catch {
    /* unsupported */
  }

  window.addEventListener('message', (e) => {
    // only trust windows we opened, or the window that opened us
    if (e.source !== window.opener && !windows.has(e.source)) return;
    receive(e.data);
  });

  return {
    post(type, data = {}) {
      const msg = { [TAG]: true, sender, seq: ++seq, type, ...data };
      try {
        channel?.postMessage(msg);
      } catch {
        /* closed */
      }
      for (const w of windows) {
        if (w.closed) windows.delete(w);
        else w.postMessage(msg, '*');
      }
      if (window.opener && !window.opener.closed) window.opener.postMessage(msg, '*');
    },
    addWindow(w) {
      if (w) windows.add(w);
    },
    openWindows() {
      for (const w of windows) if (w.closed) windows.delete(w);
      return windows.size;
    },
  };
}

/** Opens `url` covering another screen when the Window Management API allows it. */
export async function openOnOtherScreen(url, name) {
  let features = 'width=1280,height=720';
  try {
    if ('getScreenDetails' in window) {
      const details = await window.getScreenDetails();
      const other = details.screens.find((s) => s !== details.currentScreen);
      if (other) {
        features = `left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
      }
    }
  } catch {
    /* permission refused: fall back to a regular popup */
  }
  return window.open(url, name, features);
}
