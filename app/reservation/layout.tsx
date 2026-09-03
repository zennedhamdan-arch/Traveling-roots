import FloatingWhatsApp from "@/components/FloatingWhatsApp";

/**
 * /reservation keeps its own minimal chrome (no public navbar) — but the
 * floating WhatsApp button is a global conversion element and stays
 * available, positioned well clear of the form (bottom-right, safe-area
 * aware, below any lightbox layer).
 */
export default function ReservationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <>
      {children}
      <FloatingWhatsApp />
    </>
  );
}
