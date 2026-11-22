// Local CodeJar editing and Prism highlighting, shared with read-only code samples.
import { CodeJar } from './vendor/codejar.js';

/** Prism escapes source text before adding token markup. Never insert raw code as HTML. */
export function highlightCode(element) {
  const requested = Prism.util.getLanguage(element);
  if (requested === 'vextab') {
    // The comparison lesson uses a staff block, meter, duration, pitch, and barline.
    const notation = {
      keyword: /\b(?:staff|meter)\b/,
      number: /\b\d+\/\d+\b/,
      symbol: /:\w+|\b[A-G][#b]?\d+\b/,
      punctuation: /[{}|]/,
    };
    element.innerHTML = Prism.highlight(element.textContent, notation, requested);
    return;
  }
  const language = Prism.languages[requested] ? requested : 'javascript';
  element.innerHTML = Prism.highlight(element.textContent, Prism.languages[language], language);
}

/** Keep edits, indentation, history, and mobile input behind one small interface. */
export function createEditor(element, onChange) {
  let jar,
    lastCode = '',
    inputTimer;
  const notify = () => {
    const code = jar.toString();
    if (code === lastCode) return;
    lastCode = code;
    onChange();
  };
  const initialize = () => {
    jar = CodeJar(element, highlightCode, { tab: '  ' });
    // Keep source lines aligned with the gutter; long lines scroll horizontally.
    element.style.whiteSpace = 'pre';
    element.style.overflowWrap = 'normal';
    jar.onUpdate(notify);
  };
  initialize();

  // CodeJar handles keys and paste. Input also covers dictation and mobile keyboards.
  element.addEventListener('compositionstart', () => clearTimeout(inputTimer));
  element.addEventListener('input', (event) => {
    clearTimeout(inputTimer);
    if (event.isComposing) return;
    notify();
    inputTimer = setTimeout(() => {
      // Focus can stay in an editor after its selection is cleared or moved to another example.
      const selection = window.getSelection();
      const position =
        document.activeElement === element &&
        selection?.rangeCount &&
        element.contains(selection.anchorNode) &&
        element.contains(selection.focusNode)
          ? jar.save()
          : undefined;
      highlightCode(element);
      if (position) jar.restore(position);
    }, 40);
  });
  element.addEventListener('compositionend', () => element.dispatchEvent(new Event('input')));
  // Escape then Tab leaves the editor without inserting indentation.
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') jar.updateOptions({ catchTab: false });
  });
  element.addEventListener('blur', () => jar.updateOptions({ catchTab: true }));

  return {
    getCode: () => jar.toString(),
    dispose() {
      clearTimeout(inputTimer);
      jar.destroy();
    },
    /** Select source without changing text, history, or scheduling a new render. */
    selectRange(start, end) {
      if (start < 0 || end < start || end > jar.toString().length) return;
      element.focus({ preventScroll: true });
      jar.restore({ start, end });
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const editorRect = element.getBoundingClientRect();
      if (rect.top < editorRect.top || rect.bottom > editorRect.bottom) {
        element.scrollTop += rect.top - editorRect.top - element.clientHeight / 2;
      }
    },
    setCode(code) {
      clearTimeout(inputTimer);
      // A new example or reset starts a separate undo history.
      jar.destroy();
      initialize();
      lastCode = code;
      jar.updateCode(code, false);
      element.scrollTop = 0;
      element.scrollLeft = 0;
    },
  };
}
