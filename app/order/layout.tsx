import FloatingWhatsApp from "@/components/FloatingWhatsApp";

/**
 * /order keeps its own minimal chrome (no public navbar) — but the floating
 * WhatsApp button is a global conversion element and stays available.
 */
export default function OrderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <>
      {children}
      <FloatingWhatsApp />
    </>
  );
}
