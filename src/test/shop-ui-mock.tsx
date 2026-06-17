import type { ComponentPropsWithoutRef, JSX, ReactNode } from "react";

type ElementProps<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T> & {
  asChild?: boolean;
};

function Slot({ asChild, children, ...props }: ElementProps<"button">) {
  if (asChild && children) {
    return children;
  }

  return <button {...props}>{children}</button>;
}

export function Badge({ children, ...props }: ElementProps<"span">) {
  return <span {...props}>{children}</span>;
}

export function Button({ asChild, children, ...props }: ElementProps<"button">) {
  return (
    <Slot asChild={asChild} {...props}>
      {children}
    </Slot>
  );
}

export function Container({ children, ...props }: ElementProps<"div">) {
  return <div {...props}>{children}</div>;
}

export function EmptyState({
  action,
  description,
  title,
}: Readonly<{ action?: ReactNode; description?: string; title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </section>
  );
}

export function ErrorState({
  description,
  title,
}: Readonly<{ description?: string; title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </section>
  );
}

export function Input(props: ElementProps<"input">) {
  return <input {...props} />;
}

export function Label(props: ElementProps<"label">) {
  return <label {...props} />;
}

export function LoadingState({ label, title }: Readonly<{ label?: string; title?: string }>) {
  return <p>{label ?? title}</p>;
}

export function Logo() {
  return <span>Shop</span>;
}

export function Price({
  valueCents,
  ...props
}: Readonly<{ className?: string; valueCents: number }>) {
  return <span {...props}>{valueCents}</span>;
}
