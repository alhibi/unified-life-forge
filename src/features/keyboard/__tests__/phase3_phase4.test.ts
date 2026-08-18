import { describe, expect, it } from 'vitest';

import {
  backspace,
  canUndo,
  getPreferredInitialLayout,
  getSelectionState,
  insertText,
  performUndo,
  replaceLastWord,
  selectAll,
} from '../lib/edit';
import { DE_ROWS, LAYOUT_ROWS } from '../lib/layouts';

describe('Soft Keyboard Phase 3 & 4 Tests', () => {
  describe('Selection Helpers & 1-Level Undo Engine', () => {
    it('accurately reports selection state', () => {
      const input = document.createElement('input');
      input.value = 'Hallo Welt';
      expect(getSelectionState(input)).toEqual({
        hasSelection: false,
        selectedText: '',
        start: 10,
        end: 10,
      });

      input.setSelectionRange(0, 5);
      expect(getSelectionState(input)).toEqual({
        hasSelection: true,
        selectedText: 'Hallo',
        start: 0,
        end: 5,
      });
    });

    it('selects all text using selectAll', () => {
      const input = document.createElement('input');
      input.value = 'Willkommen im Club';
      document.body.appendChild(input);

      selectAll(input);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(18);

      document.body.removeChild(input);
    });

    it('supports 1-level undo for text insertion', () => {
      const input = document.createElement('input');
      input.value = 'Guten ';
      input.setSelectionRange(6, 6);

      expect(canUndo(input)).toBe(false);

      insertText(input, 'Tag');
      expect(input.value).toBe('Guten Tag');
      expect(canUndo(input)).toBe(true);

      const undone = performUndo(input);
      expect(undone).toBe(true);
      expect(input.value).toBe('Guten ');
      expect(canUndo(input)).toBe(false);
    });

    it('supports 1-level undo for backspace operation', () => {
      const input = document.createElement('input');
      input.value = 'Hallo!';
      input.setSelectionRange(6, 6);

      backspace(input);
      expect(input.value).toBe('Hallo');
      expect(canUndo(input)).toBe(true);

      performUndo(input);
      expect(input.value).toBe('Hallo!');
    });

    it('supports 1-level undo for replaceLastWord operation', () => {
      const input = document.createElement('input');
      input.value = 'Tschus';
      input.setSelectionRange(6, 6);

      replaceLastWord(input, 'Tschus', 'Tschüss');
      expect(input.value).toBe('Tschüss');

      performUndo(input);
      expect(input.value).toBe('Tschus');
    });
  });

  describe('German Layout Definition (de)', () => {
    it('defines German QWERTZ layout in LAYOUT_ROWS', () => {
      expect(LAYOUT_ROWS.de).toBeDefined();
      expect(LAYOUT_ROWS.de).toBe(DE_ROWS);
      expect(DE_ROWS.length).toBe(3);
    });

    it('contains German special characters ä, ö, ü, ß', () => {
      const allChars = DE_ROWS.flat().map((k) => k.ch);
      expect(allChars).toContain('ä');
      expect(allChars).toContain('ö');
      expect(allChars).toContain('ü');
      expect(allChars).toContain('ß');
    });

    it('provides capital/alternative popups for German keys', () => {
      const row1 = DE_ROWS[0];
      const row2 = DE_ROWS[1];

      const uKey = row1.find((k) => k.ch === 'u');
      expect(uKey?.popups).toContain('ü');
      expect(uKey?.popups).toContain('Ü');

      const aKey = row2.find((k) => k.ch === 'a');
      expect(aKey?.popups).toContain('ä');
      expect(aKey?.popups).toContain('Ä');

      const sKey = row2.find((k) => k.ch === 's');
      expect(sKey?.popups).toContain('ß');
      expect(sKey?.popups).toContain('SS');
    });
  });

  describe('German Club Auto-Layout Selection', () => {
    it('defaults to de layout when input has data-keyboard-layout="de"', () => {
      const input = document.createElement('input');
      input.dataset.keyboardLayout = 'de';
      expect(getPreferredInitialLayout(input)).toBe('de');
    });

    it('defaults to de layout when element is inside a container with data-keyboard-layout="de"', () => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-keyboard-layout', 'de');
      const input = document.createElement('input');
      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      expect(getPreferredInitialLayout(input)).toBe('de');

      document.body.removeChild(wrapper);
    });

    it('defaults to ar for standard inputs outside german club context', () => {
      const input = document.createElement('input');
      expect(getPreferredInitialLayout(input)).toBe('ar');
    });
  });
});
