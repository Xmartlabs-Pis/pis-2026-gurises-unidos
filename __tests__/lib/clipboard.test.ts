import { afterEach, describe, expect, test, vi } from 'vitest';
import { copyText } from '@/lib/clipboard';

const writeText = vi.fn();
const execCommand = vi.fn();

function setContext({ secure, clipboard }: { secure: boolean; clipboard: boolean }) {
  vi.stubGlobal('isSecureContext', secure);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: clipboard ? { writeText } : undefined,
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('copyText', () => {
  test('uses the clipboard API in a secure context', async () => {
    setContext({ secure: true, clipboard: true });

    await copyText('secret');

    expect(writeText).toHaveBeenCalledWith('secret');
    expect(execCommand).not.toHaveBeenCalled();
  });

  test('falls back to the copy command outside a secure context', async () => {
    setContext({ secure: false, clipboard: false });
    let copied = '';
    execCommand.mockImplementation(() => {
      copied = document.querySelector('textarea')!.value;
      return true;
    });

    await copyText('secret');

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copied).toBe('secret');
    expect(document.querySelector('textarea')).toBeNull();
  });

  test('places the fallback textarea inside the focused dialog and restores focus', async () => {
    setContext({ secure: false, clipboard: false });
    document.body.innerHTML = '<div role="dialog"><button>Copiar</button></div>';
    const button = document.querySelector('button')!;
    button.focus();
    let parent: Element | null = null;
    execCommand.mockImplementation(() => {
      parent = document.querySelector('textarea')!.parentElement;
      return true;
    });

    await copyText('secret');

    expect(parent).toBe(document.querySelector('[role="dialog"]'));
    expect(document.activeElement).toBe(button);
  });

  test('throws when the copy command is rejected', async () => {
    setContext({ secure: false, clipboard: false });
    execCommand.mockReturnValue(false);

    await expect(copyText('secret')).rejects.toThrow();
    expect(document.querySelector('textarea')).toBeNull();
  });
});
