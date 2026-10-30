import { beforeEach, describe, expect, test, vi } from 'vitest';
import { toast } from '@/components/ui/toast';
import { notify } from '@/lib/notify';

vi.mock('@/components/ui/toast', () => ({
  toast: { add: vi.fn(), promise: vi.fn() },
}));

const toastAdd = vi.mocked(toast.add);
const toastPromise = vi.mocked(toast.promise);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('notifiers', () => {
  test.each([
    { type: 'success' as const, timeout: 3000 },
    { type: 'info' as const, timeout: 3000 },
    { type: 'warning' as const, timeout: 5000 },
    { type: 'error' as const, timeout: 5000 },
  ])('$type adds a toast with its type and a $timeout ms default timeout', ({ type, timeout }) => {
    notify[type]({ title: 'Title', description: 'Description' });

    expect(toastAdd).toHaveBeenCalledTimes(1);
    expect(toastAdd).toHaveBeenCalledWith({
      type,
      title: 'Title',
      description: 'Description',
      timeout,
      actionProps: undefined,
    });
  });

  test('uses the given timeout instead of the default', () => {
    notify.error({ title: 'Title', timeout: 10000 });

    expect(toastAdd.mock.calls[0][0].timeout).toBe(10000);
  });

  test('keeps a timeout of 0 so the toast does not auto-dismiss', () => {
    notify.info({ title: 'Title', timeout: 0 });

    expect(toastAdd.mock.calls[0][0].timeout).toBe(0);
  });

  test('maps the action to the toast action props', () => {
    const onClick = vi.fn();

    notify.warning({ title: 'Title', action: { label: 'Undo', onClick } });

    expect(toastAdd.mock.calls[0][0].actionProps).toEqual({ children: 'Undo', onClick });
  });

  test('returns the id of the created toast', () => {
    toastAdd.mockReturnValue('toast-id');

    expect(notify.success({ title: 'Title' })).toBe('toast-id');
  });
});

describe('notify.promise', () => {
  const messages = { loading: 'Saving...', success: 'Saved', error: 'Could not save' };

  test('maps each message to its toast state with the matching default timeout', () => {
    const promise = Promise.resolve('value');
    toastPromise.mockImplementation(async (value) => value);

    notify.promise(promise, messages);

    expect(toastPromise).toHaveBeenCalledWith(promise, {
      loading: { title: 'Saving...' },
      success: { title: 'Saved', timeout: 3000 },
      error: { title: 'Could not save', timeout: 5000 },
    });
  });

  test('resolves with the value of the original promise', async () => {
    toastPromise.mockImplementation(async (value) => value);

    await expect(notify.promise(Promise.resolve('value'), messages)).resolves.toBe('value');
  });

  test('still rejects for callers that await the result', async () => {
    toastPromise.mockImplementation(() => Promise.reject(new Error('failed')));

    await expect(notify.promise(Promise.resolve(), messages)).rejects.toThrow('failed');
  });

  test('does not leave an unhandled rejection when the caller ignores the result', async () => {
    const unhandled = vi.fn();
    const original = toast.promise;
    toast.promise = (() => Promise.reject(new Error('failed'))) as typeof toast.promise;
    process.on('unhandledRejection', unhandled);

    try {
      notify.promise(Promise.resolve(), messages);
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      process.off('unhandledRejection', unhandled);
      toast.promise = original;
    }

    expect(unhandled).not.toHaveBeenCalled();
  });
});
