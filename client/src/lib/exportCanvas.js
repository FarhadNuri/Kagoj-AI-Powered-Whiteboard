// Native-SVG export. No foreignObject anywhere, so the result rasterizes cleanly to PNG.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChartElement from "../components/board/ChartElement";
import { arrowHead, diamondPoints, getBounds, strokeToPath } from "./canvas";
import { seededRandom, sketchEllipse, sketchLine, sketchPolygon, sketchRect } from "./sketch";
import { urlToDataURL } from "./image";

const INK = "#16161d";
const PAD = 48;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fontFamily = (font) => (font === "hand" ? "Caveat, Segoe Script, cursive" : "Inter, sans-serif");

function wrap(text, maxChars) {
  const lines = [];
  for (const para of String(text ?? "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if ((line + " " + word).length <= maxChars) line += " " + word;
      else {
        lines.push(line);
        line = word;
      }
      while (line.length > maxChars) {
        lines.push(line.slice(0, maxChars));
        line = line.slice(maxChars);
      }
    }
    lines.push(line);
  }
  return lines;
}

export function textSvg(x, y, w, text, opts = {}) {
  const {
    fontSize = 16,
    lineHeight = 1.35,
    font,
    weight = 400,
    color = INK,
    align = "left",
    valign = "top",
    h,
  } = opts;
  if (text == null || text === "") return "";
  const lh = fontSize * lineHeight;
  const lines = wrap(text, Math.max(1, Math.floor((w - 4) / (fontSize * 0.55))));
  const top = valign === "middle" && h ? y + (h - lines.length * lh) / 2 : y;
  const tx = align === "center" ? x + w / 2 : align === "right" ? x + w : x;
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const spans = lines
    .map((l, i) => `<tspan x="${tx}" y="${top + i * lh + lh / 2 + fontSize * 0.35}">${esc(l)}</tspan>`)
    .join("");
  return `<text font-family="${fontFamily(font)}" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" xml:space="preserve">${spans}</text>`;
}

const MARKS = { disc: "•", circle: "◦", square: "▪", none: "" };

function bulletSvg(d) {
  const fs = d.fontSize || 16;
  const lh = fs * 1.7;
  const indent = fs * 1.3;
  const w = d.w || 280;
  const maxChars = Math.max(1, Math.floor((w - indent - 4) / (fs * 0.55)));
  let y = d.y + 6;
  let out = "";
  (d.items || []).forEach((item, i) => {
    const lines = wrap(item, maxChars);
    const mark = d.bulletStyle === "decimal" ? `${i + 1}.` : (MARKS[d.bulletStyle] ?? MARKS.disc);
    const base = (n) => y + n * lh + lh / 2 + fs * 0.35;
    const spans = lines
      .map((l, n) => `<tspan x="${d.x + indent}" y="${base(n)}">${esc(l)}</tspan>`)
      .join("");
    out += `<text font-family="${fontFamily(d.font)}" font-size="${fs}" fill="${d.color || INK}" xml:space="preserve">`;
    if (mark) out += `<tspan x="${d.x}" y="${base(0)}">${esc(mark)}</tspan>`;
    out += `${spans}</text>`;
    y += lines.length * lh;
  });
  return out;
}

function shapeSvg(el) {
  const d = el.data;
  const b = getBounds(el);
  const stroke = d.stroke || INK;
  const sw = d.strokeWidth || 2;
  const fill = d.fill || "none";
  const rand = d.sketch ? seededRandom(el.id) : null;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const base = `fill="${fill === "transparent" ? "none" : fill}" stroke="${rand ? "none" : stroke}" stroke-width="${sw}"`;
  const sketch = (path) =>
    `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  let out = "";
  if (el.type === "rect") {
    out += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${d.radius || 0}" ${base}/>`;
    if (rand) out += sketch(sketchRect(b.x, b.y, b.w, b.h, rand));
  } else if (el.type === "ellipse") {
    out += `<ellipse cx="${cx}" cy="${cy}" rx="${b.w / 2}" ry="${b.h / 2}" ${base}/>`;
    if (rand) out += sketch(sketchEllipse(cx, cy, b.w / 2, b.h / 2, rand));
  } else {
    out += `<polygon points="${diamondPoints(b)}" ${base}/>`;
    if (rand) {
      out += sketch(
        sketchPolygon(
          [
            [cx, b.y],
            [b.x + b.w, cy],
            [cx, b.y + b.h],
            [b.x, cy],
          ],
          rand,
        ),
      );
    }
  }
  out += textSvg(b.x, b.y, b.w, d.label, {
    fontSize: d.font === "hand" ? 16 : 14,
    font: d.font,
    align: "center",
    valign: "middle",
    h: b.h,
  });
  return out;
}

function lineSvg(el) {
  const d = el.data;
  const stroke = d.stroke || INK;
  const sw = d.strokeWidth || 2;
  let out = d.sketch
    ? `<path d="${sketchLine(d.x1, d.y1, d.x2, d.y2, seededRandom(el.id))}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`
    : `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
  if (el.type === "arrow") {
    out += `<polygon points="${arrowHead(d.x1, d.y1, d.x2, d.y2, 8 + sw * 2)}" fill="${stroke}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`;
  }
  return out;
}

function inner(el) {
  const d = el.data || {};
  const b = getBounds(el);
  switch (el.type) {
    case "rect":
    case "ellipse":
    case "diamond":
      return shapeSvg(el);
    case "line":
    case "arrow":
      return lineSvg(el);
    case "draw":
      return `<path d="${strokeToPath(d.points, d.strokeWidth || 4)}" fill="${d.stroke || INK}"/>`;
    case "text":
      return textSvg(b.x, b.y, b.w, d.text, {
        fontSize: d.fontSize || 20,
        weight: d.weight || 500,
        font: d.font,
        color: d.color || INK,
      });
    case "sticky":
      return (
        `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${d.fill || "#fde68a"}" stroke="rgba(0,0,0,0.08)"/>` +
        textSvg(b.x + 14, b.y + 14, b.w - 28, d.text, {
          fontSize: d.fontSize || 18,
          lineHeight: d.font === "hand" ? 1.15 : 1.35,
          font: d.font,
          color: d.color || INK,
        })
      );
    case "bullet":
      return bulletSvg(d);
    case "chart":
      return renderToStaticMarkup(createElement(ChartElement, { element: el }));
    case "image":
      return `<image href="${esc(d.src)}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" preserveAspectRatio="xMidYMid slice"/>`;
    case "emoji":
      return `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" font-size="${Math.min(b.w, b.h) * 0.86}" text-anchor="middle" dominant-baseline="central">${esc(d.emoji || d.text)}</text>`;
    default:
      return "";
  }
}

export function elementSvg(el) {
  const body = inner(el);
  const r = el.data?.rotation;
  if (!r) return body;
  const b = getBounds(el);
  return `<g transform="rotate(${r} ${b.x + b.w / 2} ${b.y + b.h / 2})">${body}</g>`;
}

export function buildSvgString(elements, { background = "#ffffff" } = {}) {
  let minX = 0;
  let minY = 0;
  let maxX = 200;
  let maxY = 200;
  if (elements.length) {
    minX = minY = Infinity;
    maxX = maxY = -Infinity;
    for (const el of elements) {
      const b = getBounds(el);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
  }
  const x = minX - PAD;
  const y = minY - PAD;
  const w = Math.ceil(maxX - minX + PAD * 2);
  const h = Math.ceil(maxY - minY + PAD * 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>` +
    elements.map(elementSvg).join("") +
    `</svg>`
  );
}

export async function inlineImages(elements) {
  return Promise.all(
    elements.map(async (el) => {
      if (el.type !== "image" || !el.data?.src || el.data.src.startsWith("data:")) return el;
      try {
        return { ...el, data: { ...el.data, src: await urlToDataURL(el.data.src) } };
      } catch {
        return el;
      }
    }),
  );
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSVG(elements, name = "whiteboard") {
  const svg = buildSvgString(await inlineImages(elements));
  download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
}

export async function exportPNG(elements, name = "whiteboard", scale = 2) {
  const svg = buildSvgString(await inlineImages(elements));
  const { width, height } = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement.viewBox.baseVal;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("PNG export failed"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"),
    );
    download(blob, `${name}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
