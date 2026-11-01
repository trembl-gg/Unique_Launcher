class FileDropController {
  constructor({ resolveTarget, importFiles, report }) {
    Object.assign(this, { resolveTarget, importFiles, report });
    this.busy = false;
    this.highlight = null;
    this.onOver = event => {
      event.preventDefault();
      if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
      const target = this.resolveTarget(event.target);
      this.mark(target?.element);
      event.dataTransfer.dropEffect = target && !this.busy ? 'copy' : 'none';
    };
    this.onDrop = async event => {
      // Cancel navigation everywhere, not just over a valid drop target.
      event.preventDefault();
      const target = this.resolveTarget(event.target);
      this.mark(null);
      const files = Array.from(event.dataTransfer?.files || []);
      if (!files.length) return;
      event.stopPropagation();
      if (!target) { this.report('Перетащите файл на кнопку скина/плаща или в раздел содержимого сборки.'); return; }
      if (this.busy) { this.report('Дождитесь завершения текущего импорта.'); return; }
      this.busy = true;
      target.element.setAttribute('aria-busy', 'true');
      try { await this.importFiles(target.type, files); }
      catch (error) { this.report(error.message); }
      finally { this.busy = false; target.element.removeAttribute('aria-busy'); }
    };
    this.onLeave = event => { if (!event.relatedTarget) this.mark(null); };
    window.addEventListener('dragover', this.onOver);
    window.addEventListener('drop', this.onDrop);
    window.addEventListener('dragleave', this.onLeave);
    window.api?.onNativeFileDrop?.(async ({ names, x, y }) => {
      if (this.disposed) return;
      const target = this.resolveTarget(document.elementFromPoint(x, y));
      if (!target) { this.report('Перетащите файл на кнопку скина/плаща или в раздел содержимого сборки.'); return; }
      if (this.busy) { this.report('Дождитесь завершения текущего импорта.'); return; }
      this.busy = true;
      target.element.setAttribute('aria-busy', 'true');
      try { await this.importFiles(target.type, names.map(name => ({ name }))); }
      catch (error) { this.report(error.message); }
      finally { this.busy = false; target.element.removeAttribute('aria-busy'); }
    });
    window.api?.onNativeDropError?.(error => { if (!this.disposed) this.report(error); });
  }
  mark(element) {
    if (this.highlight === element) return;
    this.highlight?.classList.remove('file-drop-active');
    this.highlight = element;
    this.highlight?.classList.add('file-drop-active');
  }
  dispose() {
    this.disposed = true;
    this.mark(null);
    window.removeEventListener('dragover', this.onOver);
    window.removeEventListener('drop', this.onDrop);
    window.removeEventListener('dragleave', this.onLeave);
  }
}
window.FileDropController = FileDropController;
