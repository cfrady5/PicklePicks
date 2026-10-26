import fs from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import type { HypeJob } from "./types";
import { formatOdds } from "@/lib/utils";
import { SPORTS } from "@/lib/constants";

const W = 1080, H = 1920;
const PAD_X = 84, CW = W - PAD_X * 2; // content width

let fontCache: { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }[] | null = null;
async function fonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "assets", "fonts");
  const read = async (f: string) => { const b = await fs.readFile(path.join(dir, f)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
  fontCache = [
    { name: "Inter", data: await read("inter-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Inter", data: await read("inter-latin-700-normal.woff"), weight: 700, style: "normal" },
    { name: "Inter", data: await read("inter-latin-800-normal.woff"), weight: 800, style: "normal" },
    { name: "Space Grotesk", data: await read("space-grotesk-latin-700-normal.woff"), weight: 700, style: "normal" },
  ];
  return fontCache;
}

async function logoDataUrl() {
  const buf = await fs.readFile(path.join(process.cwd(), "public", "mascot-512.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Backdrop: the AI image (cover-fit) or a brand radial gradient in the team's colors. */
async function backdrop(image: Buffer | null, colors: [string, string]) {
  if (image) return sharp(image).resize(W, H, { fit: "cover", position: "attention" }).png().toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.55"/><stop offset="45%" stop-color="#101C15"/><stop offset="100%" stop-color="#080D0A"/></radialGradient><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#8DFF32" stroke-opacity="0.08"/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#grid)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Dark legibility gradient + neon frame, composited above the backdrop and below the text layer. */
function scrim() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080D0A" stop-opacity="0.78"/><stop offset="0.26" stop-color="#080D0A" stop-opacity="0.05"/><stop offset="0.5" stop-color="#080D0A" stop-opacity="0"/><stop offset="0.76" stop-color="#080D0A" stop-opacity="0.86"/><stop offset="1" stop-color="#080D0A" stop-opacity="1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#s)"/><rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="48" fill="none" stroke="#8DFF32" stroke-opacity="0.55" stroke-width="3"/></svg>`;
  return Buffer.from(svg);
}

/**
 * Renders the branded 1080×1920 cover. The AI image (if any) is the backdrop;
 * brand frame, hook, pick ticket and compliance footer are composited on top
 * deterministically, so text is always crisp and never AI-garbled.
 *
 * Note: satori paints absolutely-positioned elements above later siblings, so
 * the text layer is a plain flex column on a transparent background and all
 * layering is done in sharp.
 */
export async function renderCover(job: HypeJob, backgroundUrl?: string | null): Promise<{ png: Buffer; jpeg: Buffer }> {
  const usable = backgroundUrl && !backgroundUrl.startsWith("simulated://") ? backgroundUrl : null;
  const [fontList, logo, image] = await Promise.all([fonts(), logoDataUrl(), usable ? fetchImage(usable) : Promise.resolve(null)]);
  const sport = SPORTS.find((s) => s.key === job.pick.sport);
  const subject = job.subject;
  const hook = job.brief?.hook ?? "FRESH PICK.";
  const colors = subject?.colors ?? ["#8DFF32", "#49D967"];
  const hookSize = hook.length > 26 ? 84 : hook.length > 18 ? 104 : 124;

  const satoriOpts = { width: W, fonts: fontList } as Parameters<typeof satori>[1];
  const rasterize = async (svg: string) => {
    const png = Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng());
    const meta = await sharp(png).metadata();
    return { png, height: meta.height ?? 0 };
  };

  // Header and bottom block are rendered separately with auto height, then
  // anchored to the top and bottom of the canvas in sharp. This avoids any
  // dependence on satori's flex measurement for the overall vertical layout.
  const headerSvg = await satori(
    <div style={{ width: W, display: "flex", paddingTop: 76, paddingLeft: PAD_X, fontFamily: "Inter", color: "#F7FFF4" }}>
     <div style={{ width: CW, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={112} height={112} alt="" style={{ borderRadius: 999 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Space Grotesk", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Mr. Pickle&apos;s</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 8, color: "#8DFF32" }}>PICKS</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 26px", borderRadius: 999, border: "2px solid rgba(141,255,50,0.6)", background: "rgba(141,255,50,0.14)", color: "#8DFF32", fontSize: 26, fontWeight: 800, letterSpacing: 4 }}>
        {sport?.label?.toUpperCase() ?? job.pick.sport}
      </div>
     </div>
    </div>,
    satoriOpts,
  );

  const selectionSize = job.pick.selection.length > 26 ? 40 : job.pick.selection.length > 18 ? 48 : 58;
  const bottomSvg = await satori(
    <div style={{ width: W, display: "flex", flexDirection: "column", paddingLeft: PAD_X, paddingBottom: 86, fontFamily: "Inter", color: "#F7FFF4" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: "#8DFF32", marginBottom: 18 }}>THE PICKLE KNOWS BALL</div>
      <div style={{ width: CW, fontFamily: "Space Grotesk", fontSize: hookSize, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>{hook}</div>
      {subject && <div style={{ marginTop: 22, fontSize: 30, fontWeight: 700, color: "#C8D8CC" }}>{`feat. ${subject.name} · ${subject.team}`}</div>}
      <div style={{ width: CW, display: "flex", flexDirection: "column", marginTop: 40, borderRadius: 36, background: "rgba(21,35,26,0.94)", border: "2px solid #2F4B3A", paddingTop: 34, paddingBottom: 34, paddingLeft: 44, paddingRight: 44 }}>
        <div style={{ width: CW - 92, display: "flex", justifyContent: "space-between", fontSize: 26, color: "#94A69A", fontWeight: 700, letterSpacing: 3 }}>
          <span>{job.pick.matchup.toUpperCase()}</span>
          <span>{job.pick.betType.replace("_", " ").toUpperCase()}</span>
        </div>
        <div style={{ width: CW - 92, display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 }}>
          <div style={{ width: 600, fontFamily: "Space Grotesk", fontSize: selectionSize, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }}>{job.pick.selection}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 72, fontWeight: 700, color: "#8DFF32", lineHeight: 1 }}>{formatOdds(job.pick.odds)}</div>
            <div style={{ fontSize: 26, color: "#94A69A", fontWeight: 700 }}>{`${job.pick.stake.toFixed(1)}u stake`}</div>
          </div>
        </div>
      </div>
      <div style={{ width: CW, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 30, fontSize: 22, color: "#94A69A", fontWeight: 700 }}>
        <span>Picks are opinions, not guarantees · 21+ · Gamble responsibly</span>
        <span style={{ color: "#8DFF32" }}>@mr.pickles.picks</span>
      </div>
    </div>,
    satoriOpts,
  );

  const [header, bottom] = await Promise.all([rasterize(headerSvg), rasterize(bottomSvg)]);
  const bottomTop = Math.max(header.height + 40, H - bottom.height);
  const png = await sharp(await backdrop(image, colors))
    .composite([{ input: scrim() }, { input: header.png, top: 0, left: 0 }, { input: bottom.png, top: bottomTop, left: 0 }])
    .png()
    .toBuffer();
  const jpeg = await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  return { png, jpeg };
}
