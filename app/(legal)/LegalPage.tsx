import type { Metadata } from "next";
import Link from "next/link";

import styles from "./legal.module.css";

type LegalPageProps = Readonly<{
  title: string;
  updated: string;
  children: React.ReactNode;
}>;

export function legalMetadata(title: string, description: string): Metadata {
  return { title, description, robots: { index: true, follow: true } };
}

export default function LegalPage({
  title,
  updated,
  children,
}: LegalPageProps): React.JSX.Element {
  return (
    <main id="main" className={styles.page}>
      <div className="shell">
        <p className="eyebrow">Legal</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated {updated}</p>
        <div className={styles.prose}>{children}</div>
        <p className={styles.back}>
          <Link href="/">← Back to Traveling Roots</Link>
        </p>
      </div>
    </main>
  );
}
