import ChartElement from "./ChartElement";
import { arrowHead, diamondPoints, fontFamilyFor, getBounds, strokeToPath } from "../../lib/canvas";
import {
  seededRandom,
  sketchEllipse,
  sketchLine,
  sketchPolygon,
  sketchRect,
} from "../../lib/sketch";

const INK = "#16161d";

function ShapeLabel({ b, d, editing }) {
  if (!d.label || editing) return null;
  return (
    <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 8,
          boxSizing: "border-box",
          fontSize: d.font === "hand" ? 16 : 14,
          fontFamily: fontFamilyFor(d.font),
          color: INK,
          overflowWrap: "break-word",
        }}
      >
        {d.label}
      </div>
    </foreignObject>
  );
}

function Shape({ element, editing }) {
  const d = element.data;
  const b = getBounds(element);
  const stroke = d.stroke || INK;
  const strokeWidth = d.strokeWidth || 2;
  const fill = d.fill || "transparent";
  const rand = d.sketch ? seededRandom(element.id) : null;
  const common = { fill, stroke: d.sketch ? "none" : stroke, strokeWidth };
  const sketchProps = { fill: "none", stroke, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const diamond = [
    [cx, b.y],
    [b.x + b.w, cy],
    [cx, b.y + b.h],
    [b.x, cy],
  ];

  return (
    <g>
      {element.type === "rect" && (
        <>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={d.radius || 0} {...common} />
          {rand && <path d={sketchRect(b.x, b.y, b.w, b.h, rand)} {...sketchProps} />}
        </>
      )}
      {element.type === "ellipse" && (
        <>
          <ellipse cx={cx} cy={cy} rx={b.w / 2} ry={b.h / 2} {...common} />
          {rand && <path d={sketchEllipse(cx, cy, b.w / 2, b.h / 2, rand)} {...sketchProps} />}
        </>
      )}
      {element.type === "diamond" && (
        <>
          <polygon points={diamondPoints(b)} {...common} />
          {rand && <path d={sketchPolygon(diamond, rand)} {...sketchProps} />}
        </>
      )}
      <ShapeLabel b={b} d={d} editing={editing} />
    </g>
  );
}

function LineLike({ element }) {
  const d = element.data;
  const stroke = d.stroke || INK;
  const strokeWidth = d.strokeWidth || 2;
  return (
    <g>
      {d.sketch ? (
        <path
          d={sketchLine(d.x1, d.y1, d.x2, d.y2, seededRandom(element.id))}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ) : (
        <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
      {element.type === "arrow" && (
        <polygon
          points={arrowHead(d.x1, d.y1, d.x2, d.y2, 8 + strokeWidth * 2)}
          fill={stroke}
          stroke={stroke}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function Sticky({ element, editing }) {
  const d = element.data;
  const b = getBounds(element);
  const hand = d.font === "hand";
  return (
    <g>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={10}
        fill={d.fill || "#fde68a"}
        stroke="rgba(0,0,0,0.08)"
      />
      {!editing && (
        <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
          <div
            style={{
              padding: 14,
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              fontSize: d.fontSize || 18,
              lineHeight: hand ? 1.15 : 1.35,
              fontFamily: fontFamilyFor(d.font),
              color: d.color || INK,
            }}
          >
            {d.text}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function TextBlock({ element, editing }) {
  const d = element.data;
  const b = getBounds(element);
  if (editing) return null;
  return (
    <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
      <div
        style={{
          fontSize: d.fontSize || 20,
          fontWeight: d.weight || 500,
          fontFamily: fontFamilyFor(d.font),
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          lineHeight: 1.35,
          color: d.color || INK,
        }}
      >
        {d.text}
      </div>
    </foreignObject>
  );
}

function Bullets({ element, editing }) {
  const d = element.data;
  const b = getBounds(element);
  if (editing) return null;
  return (
    <foreignObject x={b.x} y={b.y} width={b.w} height={b.h}>
      <ul
        style={{
          margin: 0,
          paddingLeft: "1.3em",
          listStyleType: d.bulletStyle || "disc",
          lineHeight: 1.7,
          fontSize: d.fontSize || 16,
          color: d.color || INK,
          fontFamily: fontFamilyFor(d.font),
        }}
      >
        {(d.items || []).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </foreignObject>
  );
}

export default function ElementRenderer({ element, editing = false }) {
  const d = element.data || {};
  const b = getBounds(element);

  switch (element.type) {
    case "rect":
    case "ellipse":
    case "diamond":
      return <Shape element={element} editing={editing} />;
    case "line":
    case "arrow":
      return <LineLike element={element} />;
    case "draw":
      return <path d={strokeToPath(d.points, d.strokeWidth || 4)} fill={d.stroke || INK} stroke="none" />;
    case "image":
      return (
        <image href={d.src} x={b.x} y={b.y} width={b.w} height={b.h} preserveAspectRatio="xMidYMid slice" />
      );
    case "emoji":
      return (
        <text
          x={b.x + b.w / 2}
          y={b.y + b.h / 2}
          fontSize={Math.min(b.w, b.h) * 0.86}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {d.emoji || d.text}
        </text>
      );
    case "sticky":
      return <Sticky element={element} editing={editing} />;
    case "text":
      return <TextBlock element={element} editing={editing} />;
    case "bullet":
      return <Bullets element={element} editing={editing} />;
    case "chart":
      return <ChartElement element={element} />;
    default:
      return null;
  }
}
