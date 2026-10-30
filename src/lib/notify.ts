import { toast } from '@/components/ui/toast';

const DEFAULT_TIMEOUTS = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

type NotifyOptions = {
  title: string;
  description?: string;
  timeout?: number;
  action?: { label: string; onClick: () => void };
};

export type NotifyPromiseMessages = {
  loading: string;
  success: string;
  error: string;
};

function createNotifier(type: keyof typeof DEFAULT_TIMEOUTS) {
  return ({ title, description, timeout, action }: NotifyOptions) =>
    toast.add({
      type,
      title,
      description,
      timeout: timeout ?? DEFAULT_TIMEOUTS[type],
      actionProps: action && { children: action.label, onClick: action.onClick },
    });
}

function notifyPromise<T>(promise: Promise<T>, messages: NotifyPromiseMessages) {
  const result = toast.promise(promise, {
    loading: { title: messages.loading },
    success: { title: messages.success, timeout: DEFAULT_TIMEOUTS.success },
    error: { title: messages.error, timeout: DEFAULT_TIMEOUTS.error },
  });
  result.catch(() => {});
  return result;
}

export const notify = {
  success: createNotifier('success'),
  info: createNotifier('info'),
  warning: createNotifier('warning'),
  error: createNotifier('error'),
  promise: notifyPromise,
};
