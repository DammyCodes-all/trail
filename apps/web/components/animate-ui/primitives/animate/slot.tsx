'use client';

import * as React from 'react';
import { motion, isMotionComponent, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

type AnyProps = Record<string, unknown>;

type DOMMotionProps<T extends HTMLElement = HTMLElement> = Omit<
  HTMLMotionProps<keyof HTMLElementTagNameMap>,
  'ref'
> & { ref?: React.Ref<T> };

type WithAsChild<Base extends object> =
  | (Base & { asChild: true; children: React.ReactElement })
  | (Base & { asChild?: false | undefined });

type SlotProps<T extends HTMLElement = HTMLElement> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: any;
} & DOMMotionProps<T>;

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as React.RefObject<T | null>).current = node;
      }
    });
  };
}

function mergeProps<T extends HTMLElement>(
  childProps: AnyProps,
  slotProps: DOMMotionProps<T>,
): AnyProps {
  const merged: AnyProps = { ...childProps, ...slotProps };

  if (childProps.className || slotProps.className) {
    merged.className = cn(
      childProps.className as string,
      slotProps.className as string,
    );
  }

  if (childProps.style || slotProps.style) {
    merged.style = {
      ...(childProps.style as React.CSSProperties),
      ...(slotProps.style as React.CSSProperties),
    };
  }

  return merged;
}

function isLazyReference(node: unknown): node is {
  $$typeof: symbol;
  _payload: PromiseLike<unknown> & { status?: string; value?: unknown };
} {
  return (
    node !== null &&
    typeof node === 'object' &&
    (node as { $$typeof?: unknown }).$$typeof === Symbol.for('react.lazy') &&
    typeof (node as { _payload?: unknown })._payload === 'object' &&
    (node as { _payload?: unknown })._payload !== null
  );
}

function resolveLazyElement(node: React.ReactNode): React.ReactElement | null {
  let current = node;
  if (isLazyReference(current)) {
    current = React.use(current._payload as never);
  }
  return React.isValidElement(current) ? current : null;
}

function Slot<T extends HTMLElement = HTMLElement>({
  children,
  ref,
  ...props
}: SlotProps<T>) {
  const resolved = resolveLazyElement(children);
  if (!resolved) {
    return null;
  }
  const isAlreadyMotion =
    typeof resolved.type === 'object' &&
    resolved.type !== null &&
    isMotionComponent(resolved.type);

  const Base = React.useMemo(
    () =>
      isAlreadyMotion
        ? (resolved.type as React.ElementType)
        : motion.create(resolved.type as React.ElementType),
    [isAlreadyMotion, resolved.type],
  );

  const { ref: childRef, ...childProps } = resolved.props as AnyProps;

  const mergedProps = mergeProps(childProps, props);

  return (
    <Base {...mergedProps} ref={mergeRefs(childRef as React.Ref<T>, ref)} />
  );
}

export {
  Slot,
  resolveLazyElement,
  type SlotProps,
  type WithAsChild,
  type DOMMotionProps,
  type AnyProps,
};
