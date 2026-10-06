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
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "80px 0px 80px 0px" }
    );
    io.observe(el);
    // Already on screen (e.g. short pages / fast paint)
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) setVisible(true);
    });
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
