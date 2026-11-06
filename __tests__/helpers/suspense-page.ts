import { Suspense, type ReactElement, type ReactNode } from 'react';

function findSuspenseChild(node: ReactNode): ReactElement | null {
  if (!node || typeof node !== 'object' || !('type' in node)) {
    return null;
  }

  const element = node as ReactElement<{ children?: ReactNode }>;

  if (element.type === Suspense) {
    return element.props.children as ReactElement;
  }

  const { children } = element.props;
  if (children === undefined || children === null) {
    return null;
  }

  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findSuspenseChild(child);
      if (found) return found;
    }
    return null;
  }

  return findSuspenseChild(children);
}

function replaceSuspense(node: ReactNode, replacement: ReactElement): ReactNode {
  if (!node || typeof node !== 'object' || !('type' in node)) {
    return node;
  }

  const element = node as ReactElement<{ children?: ReactNode }>;

  if (element.type === Suspense) {
    return replacement;
  }

  const { children } = element.props;
  if (children === undefined || children === null) {
    return element;
  }

  const nextChildren = Array.isArray(children)
    ? children.map((child) => replaceSuspense(child, replacement))
    : replaceSuspense(children, replacement);

  return { ...element, props: { ...element.props, children: nextChildren } };
}

type AsyncPageComponent = (props: Record<string, unknown>) => Promise<ReactElement>;

export async function resolveSuspenseChild(page: ReactElement): Promise<ReactElement> {
  const asyncChild = findSuspenseChild(page);
  if (!asyncChild) {
    throw new Error('No Suspense child found in page element');
  }

  const renderChild = asyncChild.type as AsyncPageComponent;
  return renderChild(asyncChild.props as Record<string, unknown>);
}

export async function hydrateSuspensePage(page: ReactElement): Promise<ReactElement> {
  const resolved = await resolveSuspenseChild(page);
  return replaceSuspense(page, resolved) as ReactElement;
}
