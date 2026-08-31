import type { AnchorHTMLAttributes } from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

type ButtonLinkProps = Readonly<{
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Opens in a new tab with the correct rel + screen-reader hint. */
  external?: boolean;
  className?: string;
}> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">;

/**
 * Every call to action on the site is a real anchor: keyboard focusable,
 * right-clickable, and meaningful without JavaScript.
 */
export default function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  external = false,
  className,
  ...rest
}: ButtonLinkProps): React.JSX.Element {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
      {external ? (
        <span className="visuallyHidden">(opens in a new tab)</span>
      ) : null}
    </a>
  );
}
