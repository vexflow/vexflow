// Parent-side preview lifecycle. Keep the isolated runtime warm across edits.
import { runPreview } from './runner.mjs';

const channel = 'vexflow-explorer';
// Inline our own runtime so delayed user errors are not masked as cross-origin script errors.
const runtime = `(${runPreview.toString()})();`.replace(/<\/script/gi, '<\\/script');
export class Preview {
  constructor(host, onMessage) {
    this.host = host;
    this.onMessage = onMessage;
    window.addEventListener('message', (event) => {
      if (event.source !== this.frame?.contentWindow || event.data?.channel !== channel) return;
      if (event.data.type === 'ready') {
        clearTimeout(this.timer);
        this.ready = true;
        this.dispatch();
        return;
      }
      // Completion belongs to the active execution, even when a newer edit is queued.
      if (event.data.type === 'done' && event.data.token === this.activeToken) {
        clearTimeout(this.timer);
        this.activeToken = undefined;
        this.dispatch();
        return;
      }
      if (event.data.token !== this.token) return;
      if (event.data.type === 'rendered') {
        this.frame.style.height = `${Math.max(245, Math.min(4000, event.data.height || 245))}px`;
        event.data.totalDuration = Math.round((performance.now() - this.started) * 10) / 10;
      }
      this.onMessage(event.data);
    });
  }
  run(request) {
    this.token = crypto.randomUUID();
    this.request = request;
    this.started = performance.now();
    this.queued = true;
    if (!this.frame) this.createFrame();
    this.dispatch();
  }

  /** Only one async example executes at a time. Intermediate edits are discarded. */
  dispatch() {
    if (!this.ready || this.activeToken || !this.queued) return;
    this.queued = false;
    this.activeToken = this.token;
    this.watch();
    this.post({ type: 'run', ...this.request });
  }

  /** Explicit reset discards arbitrary global mutations without changing the editor. */
  reset() {
    clearTimeout(this.timer);
    this.frame?.remove();
    this.frame = undefined;
    this.ready = false;
    this.activeToken = undefined;
    this.queued = false;
  }

  /** A stalled async run must be discarded before any queued code can execute. */
  watch() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const retry = this.ready && this.queued;
      const request = this.request;
      const started = this.started;
      this.reset();
      if (retry) {
        this.run(request);
        this.started = started;
        return;
      }
      this.onMessage({
        type: 'error',
        name: 'Preview timeout',
        message: 'This example did not finish. Check awaited operations, then run it again.',
      });
    }, 10000);
  }

  createFrame() {
    const frame = document.createElement('iframe');
    frame.title = 'Interactive VexFlow score';
    frame.setAttribute('sandbox', 'allow-scripts');
    // Classic scripts can load in an opaque-origin frame without bucket CORS settings.
    const asset = (name) => new URL(name, import.meta.url).href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const origin = new URL(import.meta.url).origin;
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${origin}; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none';"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}#score{max-width:100%}svg{display:block}svg *{cursor:crosshair}</style></head><body><div id="score"></div><script src="${asset('vexflow.js')}"></script><script>${runtime}</script></body></html>`;
    this.frame = frame;
    this.host.replaceChildren(frame);
    this.watch();
  }
  post(message) {
    // Controls may change while the runtime is loading or another edit is queued.
    if (message.type === 'options' && this.request) {
      const { inspect, bounds, grid } = message;
      Object.assign(this.request, { inspect, bounds, grid });
    }
    this.frame?.contentWindow?.postMessage({ channel, token: this.token, ...message }, '*');
  }
}
