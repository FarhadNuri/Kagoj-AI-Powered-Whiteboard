import { useEffect, useMemo, useRef, useState } from "react";
import { PenLine } from "lucide-react";
import ElementRenderer from "./board/ElementRenderer";
import { boardApi } from "../lib/api";
import { getBounds } from "../lib/canvas";

// Keyed by boardId + updatedAt so a board edit invalidates its cached preview.
const cache = new Map();

function sceneViewBox(elements) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const b = getBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const pad = Math.max(w, h) * 0.04;
  return `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
}

export default function BoardThumbnail({ boardId, updatedAt }) {
  const key = `${boardId}:${updatedAt}`;
  const ref = useRef(null);
  const [loaded, setLoaded] = useState({ key, elements: cache.get(key) || null });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && (setVisible(true), io.disconnect()),
      { rootMargin: "300px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || cache.has(key)) return;
    let cancelled = false;
    boardApi
      .get(boardId)
      .then(({ elements }) => {
        cache.set(key, elements || []);
        if (!cancelled) setLoaded({ key, elements: elements || [] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, key, boardId]);

  const elements = cache.get(key) ?? (loaded.key === key ? loaded.elements : null);
  const viewBox = useMemo(
    () => (elements?.length ? sceneViewBox(elements) : null),
    [elements],
  );

  return (
    <div ref={ref} className="grid h-full w-full place-items-center">
      {viewBox ? (
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="pointer-events-none h-full w-full">
          {elements.map((el) => {
            const r = el.data?.rotation;
            const b = r ? getBounds(el) : null;
            return (
              <g key={el.id} transform={r ? `rotate(${r} ${b.x + b.w / 2} ${b.y + b.h / 2})` : undefined}>
                <ElementRenderer element={el} />
              </g>
            );
          })}
        </svg>
      ) : (
        <PenLine className="h-7 w-7 text-faint/60" />
      )}
    </div>
  );
}
