import type { CSSProperties, ReactNode } from "react";
import { blockPaddingClass, type HomeBlock } from "@ugclab/tenant/store-theme";

export function HomeBlockShell({
  block,
  children,
}: {
  block: HomeBlock;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    backgroundColor: block.bgColor,
    color: block.textColor,
  };
  const inner =
    block.contentWidth === "full" ? (
      children
    ) : (
      <div className="store-container">{children}</div>
    );

  return (
    <div className={blockPaddingClass(block.paddingY)} style={style}>
      {inner}
    </div>
  );
}
