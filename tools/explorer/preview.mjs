// Parent-side preview lifecycle. A fresh sandbox isolates every edited example.
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
        this.post({ type: 'run', ...this.request });
        return;
      }
      if (event.data.token !== this.token) return;
      if (['rendered', 'error'].includes(event.data.type)) clearTimeout(this.timer);
      if (event.data.type === 'rendered')
        this.frame.style.height = `${Math.max(245, Math.min(4000, event.data.height || 245))}px`;
      this.onMessage(event.data);
    });
  }
  run(request) {
    clearTimeout(this.timer);
    this.token = crypto.randomUUID();
    this.request = request;
    const frame = document.createElement('iframe');
    frame.title = 'Interactive VexFlow score';
    frame.setAttribute('sandbox', 'allow-scripts');
    // Classic scripts can load in an opaque-origin frame without bucket CORS settings.
    const asset = (name) => new URL(name, import.meta.url).href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const origin = new URL(import.meta.url).origin;
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${origin}; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none';"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}#score{max-width:100%}svg{display:block}svg *{cursor:crosshair}</style></head><body><div id="score"></div><script src="${asset('vexflow.js')}"></script><script>${runtime}</script></body></html>`;
    this.frame = frame;
    this.host.replaceChildren(frame);
    this.timer = setTimeout(() => {
      frame.remove();
      this.onMessage({
        type: 'error',
        name: 'Preview timeout',
        message: 'This example did not finish. Check awaited operations, then run it again.',
      });
    }, 10000);
  }
  post(message) {
    this.frame?.contentWindow?.postMessage({ channel, token: this.token, ...message }, '*');
  }
}
