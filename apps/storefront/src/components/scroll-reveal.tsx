import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ScrollAnimation } from "@ugclab/tenant/store-theme";

export function ScrollReveal({
  animation = "none",
  children,
}: {
  animation?: ScrollAnimation;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(animation === "none");

  useEffect(() => {
    if (animation === "none") {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animation]);

  if (animation === "none") return <>{children}</>;

  return (
    <div
      ref={ref}
      className={`store-reveal store-reveal-${animation}${visible ? " is-visible" : ""}`}
    >
      {children}
    </div>
  );
}
