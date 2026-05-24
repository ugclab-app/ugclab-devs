import type { CSSProperties, ReactNode } from "react";
import { blockOuterClass, blockSectionStyle } from "@ugclab/tenant/block-style";
import { blockPaddingClass, type HomeBlock } from "@ugclab/tenant/store-theme";

export function HomeBlockShell({
  block,
  children,
}: {
  block: HomeBlock;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    ...blockSectionStyle(block),
  };

  const inner =
    block.contentWidth === "full" ? (
      children
    ) : (
      <div className="store-container">{children}</div>
    );

  return (
    <div className={`${blockPaddingClass(block.paddingY)} ${blockOuterClass(block)}`} style={style}>
      {inner}
    </div>
  );
}
