import { useCallback, useRef, useState } from "react";
import type { HomeBlock } from "@ugclab/tenant/store-theme";
import { cloneBlocks } from "@ugclab/tenant/store-theme";

const MAX_HISTORY = 20;

export function useBuilderHistory(initial: HomeBlock[]) {
  const [blocks, setBlocksState] = useState<HomeBlock[]>(() => cloneBlocks(initial));
  const [histVersion, setHistVersion] = useState(0);
  const pastRef = useRef<HomeBlock[][]>([]);
  const futureRef = useRef<HomeBlock[][]>([]);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const bump = () => setHistVersion((v) => v + 1);

  const commit = useCallback((next: HomeBlock[]) => {
    const snapshot = cloneBlocks(blocksRef.current);
    pastRef.current.push(snapshot);
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
    futureRef.current = [];
    const cloned = cloneBlocks(next);
    setBlocksState(cloned);
    blocksRef.current = cloned;
    bump();
  }, []);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    futureRef.current.push(cloneBlocks(blocksRef.current));
    const prev = past.pop()!;
    setBlocksState(prev);
    blocksRef.current = prev;
    bump();
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    pastRef.current.push(cloneBlocks(blocksRef.current));
    const next = future.pop()!;
    setBlocksState(next);
    blocksRef.current = next;
    bump();
  }, []);

  const resetHistory = useCallback((next: HomeBlock[]) => {
    pastRef.current = [];
    futureRef.current = [];
    const cloned = cloneBlocks(next);
    setBlocksState(cloned);
    blocksRef.current = cloned;
    bump();
  }, []);

  void histVersion;

  return {
    blocks,
    commit,
    undo,
    redo,
    resetHistory,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
