import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Square, Circle, Disc, RectangleHorizontal, Gamepad2, Minus, Dot, X,
  Plus, Trash2, ChevronRight, SplitSquareVertical, Monitor,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, GripVertical, GripHorizontal,
  Check,
} from "lucide-react";
import { Comp2D, type CompType } from "../components/keeberia/Comp2D";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "editor — keeberia" },
      { name: "description", content: "design your macropad layout." },
    ],
  }),
  component: EditorPage,
});

// ---------- types ----------
type Stage = "layout" | "components" | "pcb" | "case" | "caps";

type Region = {
  id: string;
  type: CompType;
  x: number;
  y: number;
  w: number;
  h: number;
  spec?: Record<string, string>;
};

const STAGES: Stage[] = ["layout", "components", "pcb", "case", "caps"];

const COMP_OPTIONS: { type: CompType; label: string; Icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { type: "key", label: "key", Icon: Square },
  { type: "encoder", label: "encoder", Icon: Circle },
  { type: "knob", label: "knob", Icon: Disc },
  { type: "oled", label: "oled", Icon: Monitor },
  { type: "eink", label: "e-ink", Icon: RectangleHorizontal },
  { type: "joystick", label: "joystick", Icon: Gamepad2 },
  { type: "touch", label: "touch strip", Icon: Minus },
  { type: "spacer", label: "spacer", Icon: Dot },
  { type: "blocker", label: "blocker", Icon: X },
];

// ---------- per-type spec catalog ----------
type SpecField = { key: string; label: string; options: string[] };

const SPECS: Record<CompType, SpecField[]> = {
  key: [
    { key: "switch", label: "switch", options: ["cherry mx brown", "cherry mx red", "cherry mx blue", "gateron yellow", "kailh choc brown v1", "kailh choc v2", "kailh box white", "boba u4t silent", "gateron low profile"] },
    { key: "mount", label: "mounting", options: ["hotswap", "soldered"] },
    { key: "stab", label: "stabilizer", options: ["none", "plate-mount", "pcb-mount screw-in", "pcb-mount snap-in"] },
    { key: "rgb", label: "rgb", options: ["none", "per-key (sk6812)", "underglow", "side leds"] },
    { key: "cap", label: "keycap", options: ["cherry profile", "oem profile", "xda profile", "mt3 profile", "choc profile"] },
    { key: "size", label: "size", options: ["1u", "1.25u", "1.5u", "1.75u", "2u", "2.25u"] },
  ],
  encoder: [
    { key: "model", label: "model", options: ["ec11 · 15mm shaft", "ec11 · 20mm shaft", "ec12 low-profile", "evqwgd001 scroll"] },
    { key: "shaft", label: "shaft diameter", options: ["6mm knurled", "6mm flatted", "4mm low-profile"] },
    { key: "mount", label: "mounting", options: ["through-hole", "surface mount", "panel mount"] },
    { key: "press", label: "with switch", options: ["yes", "no"] },
    { key: "detents", label: "detents", options: ["20", "24", "30", "smooth"] },
    { key: "knobfit", label: "knob compatibility", options: ["d-shaft caps", "knurled caps", "press-fit caps", "any"] },
  ],
  knob: [
    { key: "cover", label: "cover", options: ["smooth aluminum", "knurled aluminum", "knurled brass", "delrin", "wood"] },
    { key: "diameter", label: "diameter", options: ["15mm", "20mm", "25mm", "30mm"] },
    { key: "base", label: "base encoder", options: ["ec11 · 15mm shaft", "ec11 · 20mm shaft"] },
  ],
  oled: [
    { key: "panel", label: "panel", options: ["ssd1306 · 128×32", "ssd1306 · 128×64", "sh1106 · 128×64", "sh1107 · 128×128"] },
    { key: "bus", label: "interface", options: ["i2c", "spi"] },
    { key: "connector", label: "connector orientation", options: ["top", "bottom", "left", "right"] },
    { key: "cutout", label: "cutout", options: ["window", "flush mount", "raised bezel"] },
    { key: "color", label: "pixel color", options: ["white", "blue", "yellow"] },
  ],
  eink: [
    { key: "panel", label: "panel", options: ["1.54\"", "2.13\"", "2.9\"", "4.2\""] },
    { key: "connector", label: "connector orientation", options: ["top", "bottom", "left", "right"] },
    { key: "cutout", label: "cutout", options: ["window", "flush mount", "raised bezel"] },
    { key: "color", label: "color", options: ["b/w", "b/w/red", "b/w/yellow"] },
  ],
  joystick: [
    { key: "model", label: "model", options: ["alps rkjxv", "psp analog", "hall-effect 3-axis"] },
    { key: "mount", label: "mounting", options: ["through-hole", "surface mount"] },
    { key: "press", label: "click button", options: ["yes", "no"] },
  ],
  touch: [
    { key: "length", label: "length", options: ["40mm", "60mm", "80mm"] },
    { key: "controller", label: "controller", options: ["mpr121", "cap1188", "iqs7222"] },
  ],
  spacer: [],
  blocker: [],
};

function defaultSpec(type: CompType): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of SPECS[type]) out[f.key] = f.options[0];
  return out;
}

function specSummary(r: Region): string {
  const fields = SPECS[r.type];
  if (!fields.length) return "";
  const spec = r.spec ?? defaultSpec(r.type);
  return fields.map((f) => spec[f.key] ?? f.options[0]).join(" · ");
}

const uid = () => Math.random().toString(36).slice(2, 9);

function buildDefaultRegions(rows: number, cols: number): Region[] {
  const out: Region[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      out.push({ id: uid(), type: "key", x, y, w: 1, h: 1 });
    }
  }
  return out;
}

function cellsInRegion(r: Region): string[] {
  const out: string[] = [];
  for (let dy = 0; dy < r.h; dy++)
    for (let dx = 0; dx < r.w; dx++)
      out.push(`${r.x + dx},${r.y + dy}`);
  return out;
}

function regionAt(regions: Region[], x: number, y: number): Region | undefined {
  return regions.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

// ---------- page ----------
function EditorPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(4);
  const [regions, setRegions] = useState<Region[]>(() => buildDefaultRegions(4, 4));
  const [projectName, setProjectName] = useState("untitled macropad");
  const [stage, setStage] = useState<Stage>("layout");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("keeberia.init") : null;
    if (raw) {
      try {
        const { rows: r, cols: c, name } = JSON.parse(raw);
        setRows(r); setCols(c); setRegions(buildDefaultRegions(r, c));
        if (name) setProjectName(name);
      } catch { /* ignore */ }
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  const stageIdx = STAGES.indexOf(stage);
  const next = () => stageIdx < STAGES.length - 1 && setStage(STAGES[stageIdx + 1]);
  const prev = () => stageIdx > 0 && setStage(STAGES[stageIdx - 1]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <EditorHeader
        projectName={projectName}
        onRename={setProjectName}
        onNew={() => navigate({ to: "/start" })}
        stage={stage}
        setStage={setStage}
        onNext={next}
        onPrev={prev}
      />
      <main className="flex-1 flex">
        {stage === "layout" ? (
          <EditorWorkspace
            rows={rows}
            cols={cols}
            setRows={setRows}
            setCols={setCols}
            regions={regions}
            setRegions={setRegions}
          />
        ) : stage === "components" ? (
          <ComponentsWorkspace
            rows={rows}
            cols={cols}
            regions={regions}
            setRegions={setRegions}
          />
        ) : stage === "pcb" ? (
          <PcbWorkspace rows={rows} cols={cols} regions={regions} />
        ) : (
          <StagePlaceholder stage={stage} regions={regions} rows={rows} cols={cols} />
        )}
      </main>
    </div>
  );
}

function EditorHeader({
  projectName, onRename, onNew, stage, setStage, onNext, onPrev,
}: {
  projectName: string;
  onRename: (s: string) => void;
  onNew: () => void;
  stage: Stage;
  setStage: (s: Stage) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const stageIdx = STAGES.indexOf(stage);
  return (
    <header className="bg-editor-header border-b border-border/60">
      <div className="px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center size-5 rounded-[4px] bg-stone-900 text-stone-50 font-mono text-[10px]">k</span>
            <span className="font-display text-base lowercase tracking-tight">keeberia</span>
          </Link>
          <span className="text-stone-400">/</span>
          <input
            value={projectName}
            onChange={(e) => onRename(e.target.value)}
            className="bg-transparent font-mono text-sm lowercase text-stone-800 focus:outline-none focus:bg-stone-50/60 rounded px-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={stageIdx === 0}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={12} /> back
          </button>
          <button
            onClick={onNext}
            disabled={stageIdx === STAGES.length - 1}
            className="font-mono text-[10px] uppercase tracking-[0.18em] bg-stone-900 text-stone-50 hover:bg-stone-800 px-3 py-1.5 rounded inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            next: {STAGES[Math.min(stageIdx + 1, STAGES.length - 1)]} <ArrowRight size={12} />
          </button>
          <button onClick={onNew} className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded">
            new
          </button>
          <Link to="/" className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded">
            exit
          </Link>
        </div>
      </div>
      <div className="px-5 pb-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]">
        {STAGES.map((f, i) => (
          <button
            key={f}
            onClick={() => setStage(f)}
            className={`px-3 py-1.5 rounded-md transition-colors ${stage === f ? "bg-stone-900 text-stone-50" : "text-stone-500 hover:text-stone-800"}`}
          >
            {String(i + 1).padStart(2, "0")} · {f}
          </button>
        ))}
      </div>
    </header>
  );
}

// ---------- placeholder for later stages ----------
function StagePlaceholder({ stage, regions, rows, cols }: { stage: Stage; regions: Region[]; rows: number; cols: number }) {
  const counts = regions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div className="flex-1 bg-editor-canvas p-12">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-md analog-shadow p-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">stage</div>
        <h1 className="font-display text-3xl lowercase mt-1">{stage}</h1>
        <p className="font-mono text-sm lowercase text-stone-600 mt-3 leading-relaxed">
          this stage is being designed. your layout below has been carried over.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Stat label="grid" value={`${rows} × ${cols}`} />
          <Stat label="regions" value={regions.length} />
          {Object.entries(counts).map(([k, v]) => (
            <Stat key={k} label={k} value={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-secondary/40 border border-border rounded-md p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-mono text-base lowercase">{value}</div>
    </div>
  );
}

// ---------- editor workspace ----------
const MAX_R = 12;
const MAX_C = 14;

type MenuState =
  | { kind: "region"; x: number; y: number; regionId: string; submenu: boolean }
  | { kind: "row"; x: number; y: number; rowIndex: number }
  | { kind: "col"; x: number; y: number; colIndex: number }
  | null;

function EditorWorkspace({
  rows, cols, setRows, setCols, regions, setRegions,
}: {
  rows: number;
  cols: number;
  setRows: React.Dispatch<React.SetStateAction<number>>;
  setCols: React.Dispatch<React.SetStateAction<number>>;
  regions: Region[];
  setRegions: React.Dispatch<React.SetStateAction<Region[]>>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<MenuState>(null);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function selectRegionIds(ids: string[], additive: boolean) {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      for (const id of ids) next.add(id);
      return next;
    });
  }
  function toggleSelect(id: string, additive: boolean) {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (prev.has(id) && additive) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const clearSelection = () => setSelected(new Set());

  function switchType(regionId: string, type: CompType) {
    setRegions((rs) => rs.map((r) => (r.id === regionId ? { ...r, type } : r)));
    setMenu(null);
  }
  function deleteRegion(regionId: string) {
    setRegions((rs) => rs.filter((r) => r.id !== regionId));
    setSelected((s) => { const n = new Set(s); n.delete(regionId); return n; });
    setMenu(null);
  }
  function mergeSelected() {
    if (selected.size < 2) return;
    const sel = regions.filter((r) => selected.has(r.id));
    const minX = Math.min(...sel.map((r) => r.x));
    const minY = Math.min(...sel.map((r) => r.y));
    const maxX = Math.max(...sel.map((r) => r.x + r.w));
    const maxY = Math.max(...sel.map((r) => r.y + r.h));
    const w = maxX - minX, h = maxY - minY;
    const cov = new Set(sel.flatMap(cellsInRegion));
    if (cov.size !== w * h) return;
    const nr: Region = { id: uid(), type: sel[0].type, x: minX, y: minY, w, h };
    setRegions((rs) => [...rs.filter((r) => !selected.has(r.id)), nr]);
    setSelected(new Set([nr.id]));
  }
  function splitRegion(regionId: string) {
    const r = regions.find((x) => x.id === regionId);
    if (!r || (r.w === 1 && r.h === 1)) return;
    const pieces: Region[] = [];
    for (let dy = 0; dy < r.h; dy++)
      for (let dx = 0; dx < r.w; dx++)
        pieces.push({ id: uid(), type: "key", x: r.x + dx, y: r.y + dy, w: 1, h: 1 });
    setRegions((rs) => [...rs.filter((x) => x.id !== regionId), ...pieces]);
    setSelected(new Set());
    setMenu(null);
  }

  // ---- row / column ops ----
  function insertColumn(at: number) {
    if (cols >= MAX_C) return;
    setRegions((rs) => {
      const next: Region[] = [];
      for (const r of rs) {
        if (r.x >= at) next.push({ ...r, x: r.x + 1 });
        else if (r.x < at && r.x + r.w > at) next.push({ ...r, w: r.w + 1 });
        else next.push(r);
      }
      for (let y = 0; y < rows; y++) {
        const covered = next.some((r) => at >= r.x && at < r.x + r.w && y >= r.y && y < r.y + r.h);
        if (!covered) next.push({ id: uid(), type: "key", x: at, y, w: 1, h: 1 });
      }
      return next;
    });
    setCols((c) => c + 1);
    setMenu(null);
  }
  function insertRow(at: number) {
    if (rows >= MAX_R) return;
    setRegions((rs) => {
      const next: Region[] = [];
      for (const r of rs) {
        if (r.y >= at) next.push({ ...r, y: r.y + 1 });
        else if (r.y < at && r.y + r.h > at) next.push({ ...r, h: r.h + 1 });
        else next.push(r);
      }
      for (let x = 0; x < cols; x++) {
        const covered = next.some((r) => x >= r.x && x < r.x + r.w && at >= r.y && at < r.y + r.h);
        if (!covered) next.push({ id: uid(), type: "key", x, y: at, w: 1, h: 1 });
      }
      return next;
    });
    setRows((r) => r + 1);
    setMenu(null);
  }
  function deleteColumn(at: number) {
    if (cols <= 1) return;
    setRegions((rs) => {
      const next: Region[] = [];
      for (const r of rs) {
        const inside = at >= r.x && at < r.x + r.w;
        if (inside) {
          if (r.w === 1) continue;
          next.push({ ...r, w: r.w - 1, x: r.x });
        } else if (r.x > at) {
          next.push({ ...r, x: r.x - 1 });
        } else {
          next.push(r);
        }
      }
      return next;
    });
    setCols((c) => c - 1);
    setSelected(new Set());
    setMenu(null);
  }
  function deleteRow(at: number) {
    if (rows <= 1) return;
    setRegions((rs) => {
      const next: Region[] = [];
      for (const r of rs) {
        const inside = at >= r.y && at < r.y + r.h;
        if (inside) {
          if (r.h === 1) continue;
          next.push({ ...r, h: r.h - 1, y: r.y });
        } else if (r.y > at) {
          next.push({ ...r, y: r.y - 1 });
        } else {
          next.push(r);
        }
      }
      return next;
    });
    setRows((r) => r - 1);
    setSelected(new Set());
    setMenu(null);
  }

  // ---- reorder: move column `from` to position `to` (insertion index) ----
  function canMoveCol(from: number, to: number): boolean {
    if (from === to || from === to - 1) return false;
    // any merged region that overlaps but isn't fully inside the moved column blocks the move
    return !regions.some((r) => r.w > 1 && r.x <= from && r.x + r.w > from && !(r.x === from && r.w === 1));
  }
  function moveColumn(from: number, to: number) {
    if (!canMoveCol(from, to)) return;
    // build new mapping: extract column `from`, splice into position `to`
    const order: number[] = [];
    for (let i = 0; i < cols; i++) if (i !== from) order.push(i);
    const insertAt = to > from ? to - 1 : to;
    order.splice(insertAt, 0, from);
    // remap regions (only valid because no region spans the from column with w>1)
    const xMap = new Map<number, number>();
    order.forEach((oldX, newX) => xMap.set(oldX, newX));
    setRegions((rs) => rs.map((r) => {
      if (r.w === 1) return { ...r, x: xMap.get(r.x)! };
      // wide region: its columns are not the moved one — keep adjusted by counting how many of its old columns shifted
      const newXs = Array.from({ length: r.w }, (_, k) => xMap.get(r.x + k)!).sort((a, b) => a - b);
      // ensure still contiguous; if not, snap by leftmost (rare)
      return { ...r, x: newXs[0], w: r.w };
    }));
    setSelected(new Set());
  }
  function canMoveRow(from: number, to: number): boolean {
    if (from === to || from === to - 1) return false;
    return !regions.some((r) => r.h > 1 && r.y <= from && r.y + r.h > from && !(r.y === from && r.h === 1));
  }
  function moveRow(from: number, to: number) {
    if (!canMoveRow(from, to)) return;
    const order: number[] = [];
    for (let i = 0; i < rows; i++) if (i !== from) order.push(i);
    const insertAt = to > from ? to - 1 : to;
    order.splice(insertAt, 0, from);
    const yMap = new Map<number, number>();
    order.forEach((oldY, newY) => yMap.set(oldY, newY));
    setRegions((rs) => rs.map((r) => {
      if (r.h === 1) return { ...r, y: yMap.get(r.y)! };
      const newYs = Array.from({ length: r.h }, (_, k) => yMap.get(r.y + k)!).sort((a, b) => a - b);
      return { ...r, y: newYs[0], h: r.h };
    }));
    setSelected(new Set());
  }

  const selectedRegion = selected.size === 1 ? regions.find((r) => selected.has(r.id)) ?? null : null;
  const canMerge = selected.size >= 2;

  return (
    <div className="flex-1 flex bg-editor-canvas">
      {/* sidebar */}
      <aside className="w-56 border-r border-border bg-sidebar p-4 overflow-y-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">components</div>
        <div className="space-y-1">
          {COMP_OPTIONS.map((c) => (
            <button
              key={c.type}
              disabled={!selectedRegion}
              onClick={() => selectedRegion && switchType(selectedRegion.id, c.type)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm font-mono lowercase hover:bg-stone-200/40 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <c.Icon size={14} className="text-stone-700 shrink-0" />
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">selection</div>
          <button disabled={!canMerge} onClick={mergeSelected}
            className="w-full font-mono text-[11px] uppercase tracking-[0.18em] bg-stone-900 text-stone-50 rounded-md py-2 disabled:opacity-30 disabled:cursor-not-allowed">
            merge ({selected.size})
          </button>
          <button
            disabled={!selectedRegion || (selectedRegion.w === 1 && selectedRegion.h === 1)}
            onClick={() => selectedRegion && splitRegion(selectedRegion.id)}
            className="mt-2 w-full font-mono text-[11px] uppercase tracking-[0.18em] border border-stone-400 rounded-md py-2 disabled:opacity-30 disabled:cursor-not-allowed">
            split
          </button>
          <button onClick={clearSelection}
            className="mt-2 w-full font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 hover:text-stone-800">
            clear selection
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-border font-mono text-[10px] text-muted-foreground leading-relaxed">
          <div className="uppercase tracking-[0.22em] mb-2">tips</div>
          <p>· drag across cells to multi-select</p>
          <p>· shift-click to add to selection</p>
          <p>· right-click a cell for switch, insert, delete</p>
          <p>· drag a row/column header to reorder</p>
        </div>
      </aside>

      {/* canvas */}
      <div className="flex-1 relative overflow-auto p-10" onClick={() => { clearSelection(); }}>
        <Canvas
          rows={rows}
          cols={cols}
          regions={regions}
          selected={selected}
          onSelectRegion={(id, e) => { e.stopPropagation(); toggleSelect(id, e.shiftKey); }}
          onDragSelect={(ids, additive) => selectRegionIds(ids, additive)}
          onRegionContext={(id, x, y, e) => { e.preventDefault(); e.stopPropagation(); setSelected(new Set([id])); setMenu({ kind: "region", x, y, regionId: id, submenu: false }); }}
          onRowContext={(rowIndex, x, y, e) => { e.preventDefault(); e.stopPropagation(); setMenu({ kind: "row", x, y, rowIndex }); }}
          onColContext={(colIndex, x, y, e) => { e.preventDefault(); e.stopPropagation(); setMenu({ kind: "col", x, y, colIndex }); }}
          onInsertCol={insertColumn}
          onInsertRow={insertRow}
          onDeleteCol={deleteColumn}
          onDeleteRow={deleteRow}
          onMoveCol={moveColumn}
          onMoveRow={moveRow}
          canMoveCol={canMoveCol}
          canMoveRow={canMoveRow}
        />

        {menu?.kind === "region" && (() => {
          const r = regions.find((x) => x.id === menu.regionId);
          if (!r) return null;
          return (
            <RegionMenu
              x={menu.x} y={menu.y}
              region={r}
              submenuOpen={menu.submenu}
              onToggleSub={() => setMenu((m) => m && m.kind === "region" ? { ...m, submenu: !m.submenu } : m)}
              onPick={(t) => switchType(menu.regionId, t)}
              onDelete={() => deleteRegion(menu.regionId)}
              onSplit={() => splitRegion(menu.regionId)}
              onInsertRowAbove={() => insertRow(r.y)}
              onInsertRowBelow={() => insertRow(r.y + r.h)}
              onInsertColLeft={() => insertColumn(r.x)}
              onInsertColRight={() => insertColumn(r.x + r.w)}
            />
          );
        })()}
        {menu?.kind === "row" && (
          <AxisMenu
            x={menu.x} y={menu.y} kind="row" index={menu.rowIndex} total={rows}
            onInsertBefore={() => insertRow(menu.rowIndex)}
            onInsertAfter={() => insertRow(menu.rowIndex + 1)}
            onDelete={() => deleteRow(menu.rowIndex)}
            onMoveUp={() => moveRow(menu.rowIndex, menu.rowIndex - 1)}
            onMoveDown={() => moveRow(menu.rowIndex, menu.rowIndex + 2)}
            canMovePrev={canMoveRow(menu.rowIndex, menu.rowIndex - 1)}
            canMoveNext={canMoveRow(menu.rowIndex, menu.rowIndex + 2)}
          />
        )}
        {menu?.kind === "col" && (
          <AxisMenu
            x={menu.x} y={menu.y} kind="column" index={menu.colIndex} total={cols}
            onInsertBefore={() => insertColumn(menu.colIndex)}
            onInsertAfter={() => insertColumn(menu.colIndex + 1)}
            onDelete={() => deleteColumn(menu.colIndex)}
            onMoveUp={() => moveColumn(menu.colIndex, menu.colIndex - 1)}
            onMoveDown={() => moveColumn(menu.colIndex, menu.colIndex + 2)}
            canMovePrev={canMoveCol(menu.colIndex, menu.colIndex - 1)}
            canMoveNext={canMoveCol(menu.colIndex, menu.colIndex + 2)}
          />
        )}
      </div>

      {/* inspector */}
      <aside className="w-64 border-l border-border bg-sidebar p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">inspector</div>
        {selectedRegion ? (
          <InspectorPanel region={selectedRegion} />
        ) : selected.size > 1 ? (
          <div className="font-mono text-xs lowercase text-stone-700">
            {selected.size} regions selected. merge them or apply a component.
          </div>
        ) : (
          <div className="font-mono text-xs lowercase text-stone-500">
            select a cell to inspect.
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">project</div>
          <ul className="font-mono text-[11px] lowercase text-stone-700 space-y-1">
            <li>· grid: {rows} × {cols}</li>
            <li>· regions: {regions.length}</li>
            <li>· keys: {regions.filter((r) => r.type === "key").length}</li>
            <li>· special: {regions.filter((r) => r.type !== "key" && r.type !== "spacer" && r.type !== "blocker").length}</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

// ---------- canvas ----------
const CELL = 64;
const GAP = 8;
const RIM = 22;

function Canvas({
  rows, cols, regions, selected,
  onSelectRegion, onDragSelect, onRegionContext,
  onRowContext, onColContext,
  onInsertCol, onInsertRow, onDeleteCol, onDeleteRow,
  onMoveCol, onMoveRow, canMoveCol, canMoveRow,
}: {
  rows: number; cols: number; regions: Region[]; selected: Set<string>;
  onSelectRegion: (id: string, e: React.MouseEvent) => void;
  onDragSelect: (ids: string[], additive: boolean) => void;
  onRegionContext: (id: string, x: number, y: number, e: React.MouseEvent) => void;
  onRowContext: (rowIndex: number, x: number, y: number, e: React.MouseEvent) => void;
  onColContext: (colIndex: number, x: number, y: number, e: React.MouseEvent) => void;
  onInsertCol: (at: number) => void;
  onInsertRow: (at: number) => void;
  onDeleteCol: (at: number) => void;
  onDeleteRow: (at: number) => void;
  onMoveCol: (from: number, to: number) => void;
  onMoveRow: (from: number, to: number) => void;
  canMoveCol: (from: number, to: number) => boolean;
  canMoveRow: (from: number, to: number) => boolean;
}) {
  const totalW = cols * CELL + (cols - 1) * GAP;
  const totalH = rows * CELL + (rows - 1) * GAP;

  const cellsRef = useRef<HTMLDivElement | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; additive: boolean } | null>(null);

  // cell coord from pixel (relative to cells container)
  function cellFromPx(px: number, py: number): { cx: number; cy: number } | null {
    const cx = Math.floor((px + GAP / 2) / (CELL + GAP));
    const cy = Math.floor((py + GAP / 2) / (CELL + GAP));
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return null;
    return { cx, cy };
  }

  function onCellsMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // ignore if drag started outside the cells container's empty area
    const rect = cellsRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const start = cellFromPx(x, y);
    if (!start) return;
    const additive = e.shiftKey;
    e.stopPropagation();
    e.preventDefault();
    const startCx = start.cx;
    const startCy = start.cy;
    setMarquee({ x0: startCx, y0: startCy, x1: startCx, y1: startCy, additive });

    let moved = false;
    const startId = regionAt(regions, startCx, startCy)?.id;

    function onMove(ev: MouseEvent) {
      const r = cellsRef.current?.getBoundingClientRect();
      if (!r) return;
      const px = ev.clientX - r.left;
      const py = ev.clientY - r.top;
      const c = cellFromPx(Math.max(0, Math.min(totalW - 1, px)), Math.max(0, Math.min(totalH - 1, py)));
      if (!c) return;
      if (c.cx !== startCx || c.cy !== startCy) moved = true;
      setMarquee((m) => m ? { ...m, x1: c.cx, y1: c.cy } : m);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setMarquee((m) => {
        if (!m) return null;
        if (!moved) {
          // simple click — single-select region
          if (startId) onDragSelect([startId], additive);
          return null;
        }
        const minX = Math.min(m.x0, m.x1), maxX = Math.max(m.x0, m.x1);
        const minY = Math.min(m.y0, m.y1), maxY = Math.max(m.y0, m.y1);
        const ids = new Set<string>();
        for (const r of regions) {
          if (r.x + r.w - 1 >= minX && r.x <= maxX && r.y + r.h - 1 >= minY && r.y <= maxY) {
            ids.add(r.id);
          }
        }
        onDragSelect(Array.from(ids), additive);
        return null;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      className="relative mx-auto bg-card border border-stone-300 rounded-md analog-shadow"
      style={{ width: totalW + 48 + RIM * 2, minHeight: totalH + 48 + RIM * 2, padding: 24 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative" style={{ width: totalW + RIM * 2, height: totalH + RIM * 2 }}>
        {/* column header strip (top) — draggable to reorder */}
        {Array.from({ length: cols }).map((_, ci) => {
          const left = RIM + ci * (CELL + GAP);
          return (
            <div
              key={`ch-${ci}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/x-keeberia-col", String(ci));
              }}
              onContextMenu={(e) => onColContext(ci, e.clientX, e.clientY, e)}
              style={{ position: "absolute", left, top: 0, width: CELL, height: RIM }}
              className="group flex items-center justify-center cursor-grab active:cursor-grabbing"
              title="drag to reorder column · right-click for menu"
            >
              <GripHorizontal size={10} className="text-stone-300 group-hover:text-stone-600 mr-1" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-stone-400 group-hover:text-stone-700">
                {ci + 1}
              </span>
              {cols > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteCol(ci); }}
                  title="delete column"
                  className="absolute -top-0.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          );
        })}
        {/* row header strip (left) — draggable to reorder */}
        {Array.from({ length: rows }).map((_, ri) => {
          const top = RIM + ri * (CELL + GAP);
          return (
            <div
              key={`rh-${ri}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/x-keeberia-row", String(ri));
              }}
              onContextMenu={(e) => onRowContext(ri, e.clientX, e.clientY, e)}
              style={{ position: "absolute", left: 0, top, width: RIM, height: CELL }}
              className="group flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
              title="drag to reorder row · right-click for menu"
            >
              <GripVertical size={10} className="text-stone-300 group-hover:text-stone-600" />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-stone-400 group-hover:text-stone-700">
                {ri + 1}
              </span>
              {rows > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteRow(ri); }}
                  title="delete row"
                  className="absolute bottom-0 -left-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          );
        })}

        {/* column add buttons + drop slots */}
        {Array.from({ length: cols + 1 }).map((_, i) => {
          const left = RIM + i * (CELL + GAP) - GAP / 2 - 8;
          return (
            <div
              key={`addc-${i}`}
              style={{ position: "absolute", left: left - 4, top: 0, width: 24, height: RIM + totalH }}
              className="group z-20"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("text/x-keeberia-col")) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                const raw = e.dataTransfer.getData("text/x-keeberia-col");
                if (raw === "") return;
                e.preventDefault();
                const from = Number(raw);
                if (canMoveCol(from, i)) onMoveCol(from, i);
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onInsertCol(i); }}
                title="insert column"
                style={{ position: "absolute", left: 4, top: RIM - 18, width: 16, height: 16 }}
                className="rounded-full bg-stone-900 text-stone-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus size={10} />
              </button>
            </div>
          );
        })}

        {/* row add buttons + drop slots */}
        {Array.from({ length: rows + 1 }).map((_, i) => {
          const top = RIM + i * (CELL + GAP) - GAP / 2 - 8;
          return (
            <div
              key={`addr-${i}`}
              style={{ position: "absolute", left: 0, top: top - 4, width: RIM + totalW, height: 24 }}
              className="group z-20"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("text/x-keeberia-row")) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                const raw = e.dataTransfer.getData("text/x-keeberia-row");
                if (raw === "") return;
                e.preventDefault();
                const from = Number(raw);
                if (canMoveRow(from, i)) onMoveRow(from, i);
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onInsertRow(i); }}
                title="insert row"
                style={{ position: "absolute", left: RIM - 18, top: 4, width: 16, height: 16 }}
                className="rounded-full bg-stone-900 text-stone-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus size={10} />
              </button>
            </div>
          );
        })}

        {/* cells container */}
        <div
          ref={cellsRef}
          className="absolute"
          style={{ left: RIM, top: RIM, width: totalW, height: totalH }}
          onMouseDown={onCellsMouseDown}
        >
          {regions.map((r) => (
            <CellTile
              key={r.id}
              region={r}
              selected={selected.has(r.id)}
              onClick={(e) => onSelectRegion(r.id, e)}
              onContextMenu={(e) => onRegionContext(r.id, e.clientX, e.clientY, e)}
            />
          ))}
          {marquee && (() => {
            const minX = Math.min(marquee.x0, marquee.x1);
            const maxX = Math.max(marquee.x0, marquee.x1);
            const minY = Math.min(marquee.y0, marquee.y1);
            const maxY = Math.max(marquee.y0, marquee.y1);
            const left = minX * (CELL + GAP);
            const top = minY * (CELL + GAP);
            const w = (maxX - minX + 1) * CELL + (maxX - minX) * GAP;
            const h = (maxY - minY + 1) * CELL + (maxY - minY) * GAP;
            return (
              <div
                className="absolute pointer-events-none rounded-md bg-stone-900/5 border-2 border-stone-900/40"
                style={{ left, top, width: w, height: h }}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function CellTile({
  region, selected, onClick, onContextMenu,
}: {
  region: Region; selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const left = region.x * (CELL + GAP);
  const top = region.y * (CELL + GAP);
  const w = region.w * CELL + (region.w - 1) * GAP;
  const h = region.h * CELL + (region.h - 1) * GAP;
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: "absolute", left, top, width: w, height: h }}
      className={`cursor-pointer transition-all rounded-md flex items-center justify-center select-none
        ${selected ? "ring-2 ring-stone-900 ring-offset-2 ring-offset-card" : ""}`}
    >
      <Comp2D type={region.type} w={w} h={h} />
    </div>
  );
}

// Comp2D imported from shared module


// ---------- region context menu ----------
function RegionMenu({
  x, y, region, submenuOpen, onToggleSub, onPick, onDelete, onSplit,
  onInsertRowAbove, onInsertRowBelow, onInsertColLeft, onInsertColRight,
}: {
  x: number; y: number;
  region: Region;
  submenuOpen: boolean;
  onToggleSub: () => void;
  onPick: (t: CompType) => void;
  onDelete: () => void;
  onSplit: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onInsertColLeft: () => void;
  onInsertColRight: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 bg-card border border-border rounded-md analog-shadow text-stone-800 font-mono text-xs lowercase min-w-[200px]"
      style={{ left: x, top: y }}
    >
      <button onClick={onToggleSub} className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center justify-between">
        <span>switch to</span>
        <ChevronRight size={12} className="text-stone-400" />
      </button>
      <button
        onClick={onSplit}
        disabled={region.w === 1 && region.h === 1}
        className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <SplitSquareVertical size={12} /> split
      </button>
      <div className="border-t border-border" />
      <button onClick={onInsertRowAbove} className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2">
        <Plus size={12} /> insert row above
      </button>
      <button onClick={onInsertRowBelow} className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2">
        <Plus size={12} /> insert row below
      </button>
      <button onClick={onInsertColLeft} className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2">
        <Plus size={12} /> insert column left
      </button>
      <button onClick={onInsertColRight} className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2">
        <Plus size={12} /> insert column right
      </button>
      <div className="border-t border-border" />
      <button onClick={onDelete} className="w-full text-left px-3 py-2 hover:bg-secondary/60 text-rose-700 flex items-center gap-2">
        <Trash2 size={12} /> delete region
      </button>
      {submenuOpen && (
        <div className="absolute left-full top-0 ml-1 bg-card border border-border rounded-md analog-shadow min-w-[160px]">
          {COMP_OPTIONS.map((c) => (
            <button key={c.type} onClick={() => onPick(c.type)}
              className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2">
              <c.Icon size={12} className="text-stone-600" />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- axis (row/col) context menu ----------
function AxisMenu({
  x, y, kind, index, total, onInsertBefore, onInsertAfter, onDelete,
  onMoveUp, onMoveDown, canMovePrev, canMoveNext,
}: {
  x: number; y: number;
  kind: "row" | "column";
  index: number; total: number;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMovePrev: boolean;
  canMoveNext: boolean;
}) {
  const PrevIcon = kind === "row" ? ArrowUp : ArrowLeft;
  const NextIcon = kind === "row" ? ArrowDown : ArrowRight;
  const prevLabel = kind === "row" ? "move up" : "move left";
  const nextLabel = kind === "row" ? "move down" : "move right";
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 bg-card border border-border rounded-md analog-shadow text-stone-800 font-mono text-xs lowercase min-w-[200px]"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
        {kind} {index + 1}
      </div>
      <button onClick={onInsertBefore} className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2">
        <Plus size={12} /> insert {kind} before
      </button>
      <button onClick={onInsertAfter} className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2">
        <Plus size={12} /> insert {kind} after
      </button>
      <div className="border-t border-border" />
      <button
        disabled={!canMovePrev}
        onClick={onMoveUp}
        className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <PrevIcon size={12} /> {prevLabel}
      </button>
      <button
        disabled={!canMoveNext}
        onClick={onMoveDown}
        className="w-full text-left px-3 py-2 hover:bg-secondary/60 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <NextIcon size={12} /> {nextLabel}
      </button>
      <div className="border-t border-border" />
      <button
        disabled={total <= 1}
        onClick={onDelete}
        className="w-full text-left px-3 py-2 hover:bg-secondary/60 text-rose-700 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Trash2 size={12} /> delete {kind}
      </button>
    </div>
  );
}

// ---------- inspector ----------
function InspectorPanel({
  region,
  onSpecChange,
}: {
  region: Region;
  onSpecChange?: (key: string, value: string) => void;
}) {
  const meta = useMemo(() => {
    switch (region.type) {
      case "key": return { name: "key", note: "switch site. pick your switch + cap below." };
      case "encoder": return { name: "encoder", note: "rotary input. choose model and detents." };
      case "knob": return { name: "knob", note: "encoder + capped knob cover." };
      case "oled": return { name: "oled display", note: "pick panel + bus interface." };
      case "eink": return { name: "e-ink", note: "low-power info panel." };
      case "joystick": return { name: "joystick", note: "analog 2-axis input." };
      case "touch": return { name: "touch strip", note: "capacitive linear input." };
      case "spacer": return { name: "spacer", note: "intentionally empty region." };
      case "blocker": return { name: "blocker", note: "cut-out / no component here." };
    }
  }, [region.type]);

  const fields = SPECS[region.type];
  const spec = region.spec ?? defaultSpec(region.type);

  return (
    <div className="space-y-3">
      <div>
        <div className="font-display text-lg lowercase">{meta.name}</div>
        <div className="font-mono text-[10px] text-muted-foreground lowercase">id: {region.id}</div>
      </div>
      <p className="font-mono text-[11px] lowercase text-stone-700 leading-relaxed">{meta.note}</p>

      {fields.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">specs</div>
          {fields.map((f) => (
            <SpecSelect
              key={f.key}
              field={f}
              value={spec[f.key] ?? f.options[0]}
              onChange={onSpecChange ? (v) => onSpecChange(f.key, v) : undefined}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
        <Field label="x" value={region.x} />
        <Field label="y" value={region.y} />
        <Field label="w" value={region.w} />
        <Field label="h" value={region.h} />
      </div>
    </div>
  );
}

function SpecSelect({
  field, value, onChange,
}: {
  field: SpecField;
  value: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{field.label}</span>
      {onChange ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-card border border-border rounded-md px-2 py-1.5 font-mono text-xs lowercase focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          {field.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <div className="mt-1 bg-card border border-border rounded-md px-2 py-1.5 font-mono text-xs lowercase">
          {value}
        </div>
      )}
    </label>
  );
}

function Field({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-md px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

// ---------- components stage ----------
const C_CELL = 64;
const C_GAP = 8;

function ComponentsWorkspace({
  rows, cols, regions, setRegions,
}: {
  rows: number;
  cols: number;
  regions: Region[];
  setRegions: React.Dispatch<React.SetStateAction<Region[]>>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<CompType | "all">("all");

  function toggle(id: string, additive: boolean) {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (prev.has(id) && additive) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function applyType(t: CompType) {
    if (selected.size === 0) return;
    setRegions((rs) =>
      rs.map((r) => (selected.has(r.id) ? { ...r, type: t, spec: defaultSpec(t) } : r)),
    );
  }
  function applySpecField(key: string, value: string) {
    setRegions((rs) =>
      rs.map((r) =>
        selected.has(r.id)
          ? { ...r, spec: { ...(r.spec ?? defaultSpec(r.type)), [key]: value } }
          : r,
      ),
    );
  }
  function selectAllOfType(t: CompType) {
    setSelected(new Set(regions.filter((r) => r.type === t).map((r) => r.id)));
  }

  const totalW = cols * C_CELL + (cols - 1) * C_GAP;
  const totalH = rows * C_CELL + (rows - 1) * C_GAP;

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of regions) out[r.type] = (out[r.type] ?? 0) + 1;
    return out;
  }, [regions]);

  const selectedRegions = regions.filter((r) => selected.has(r.id));
  const selectedTypes = new Set(selectedRegions.map((r) => r.type));
  const visibleIds = new Set(
    filter === "all" ? regions.map((r) => r.id) : regions.filter((r) => r.type === filter).map((r) => r.id),
  );

  return (
    <div className="flex-1 flex bg-editor-canvas">
      {/* palette */}
      <aside className="w-60 border-r border-border bg-sidebar p-4 overflow-y-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">palette</div>
        <p className="font-mono text-[11px] lowercase text-stone-600 leading-relaxed mb-4">
          select cells on the right, then click a component to assign it.
        </p>
        <div className="space-y-1">
          {COMP_OPTIONS.map((c) => {
            const isCurrent = selectedTypes.size === 1 && selectedTypes.has(c.type);
            return (
              <button
                key={c.type}
                disabled={selected.size === 0}
                onClick={() => applyType(c.type)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm font-mono lowercase transition-colors
                  ${isCurrent ? "bg-stone-900 text-stone-50" : "hover:bg-stone-200/40"}
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
              >
                <c.Icon size={14} className={isCurrent ? "text-stone-50 shrink-0" : "text-stone-700 shrink-0"} />
                <span className="flex-1">{c.label}</span>
                <span className={`font-mono text-[10px] ${isCurrent ? "text-stone-300" : "text-stone-400"}`}>
                  {counts[c.type] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">selection</div>
          <button
            onClick={() => setSelected(new Set(regions.map((r) => r.id)))}
            className="w-full font-mono text-[11px] uppercase tracking-[0.18em] border border-stone-400 rounded-md py-2 hover:bg-stone-100"
          >
            select all ({regions.length})
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="mt-2 w-full font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 hover:text-stone-800"
          >
            clear selection
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">filter view</div>
          <div className="flex flex-wrap gap-1">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="all" count={regions.length} />
            {COMP_OPTIONS.filter((c) => (counts[c.type] ?? 0) > 0).map((c) => (
              <FilterChip
                key={c.type}
                active={filter === c.type}
                onClick={() => setFilter(c.type)}
                label={c.label}
                count={counts[c.type] ?? 0}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* canvas */}
      <div className="flex-1 overflow-auto p-10" onClick={() => setSelected(new Set())}>
        <div
          className="relative mx-auto bg-card border border-stone-300 rounded-md analog-shadow"
          style={{ width: totalW + 48, padding: 24 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative" style={{ width: totalW, height: totalH }}>
            {regions.map((r) => {
              const left = r.x * (C_CELL + C_GAP);
              const top = r.y * (C_CELL + C_GAP);
              const w = r.w * C_CELL + (r.w - 1) * C_GAP;
              const h = r.h * C_CELL + (r.h - 1) * C_GAP;
              const isSelected = selected.has(r.id);
              const isVisible = visibleIds.has(r.id);
              return (
                <div
                  key={r.id}
                  onClick={(e) => { e.stopPropagation(); toggle(r.id, e.shiftKey); }}
                  style={{ position: "absolute", left, top, width: w, height: h }}
                  className={`cursor-pointer rounded-md transition-all select-none
                    ${isSelected ? "ring-2 ring-stone-900 ring-offset-2 ring-offset-card" : ""}
                    ${isVisible ? "opacity-100" : "opacity-25"}`}
                >
                  <Comp2D type={r.type} w={w} h={h} />
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 size-4 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center">
                      <Check size={10} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* summary strip */}
        <div className="max-w-3xl mx-auto mt-6 grid grid-cols-2 md:grid-cols-4 gap-2">
          <SummaryStat label="regions" value={regions.length} />
          <SummaryStat label="keys" value={counts.key ?? 0} />
          <SummaryStat
            label="inputs"
            value={(counts.encoder ?? 0) + (counts.knob ?? 0) + (counts.joystick ?? 0) + (counts.touch ?? 0)}
          />
          <SummaryStat label="displays" value={(counts.oled ?? 0) + (counts.eink ?? 0)} />
        </div>
      </div>

      {/* inspector */}
      <aside className="w-64 border-l border-border bg-sidebar p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">inspector</div>
        {selectedRegions.length === 0 ? (
          <div className="font-mono text-xs lowercase text-stone-500">
            select a cell to inspect, or shift-click to multi-select.
          </div>
        ) : selectedRegions.length === 1 ? (
          <InspectorPanel
            region={selectedRegions[0]}
            onSpecChange={(k, v) => applySpecField(k, v)}
          />
        ) : (
          <div className="space-y-3">
            <div className="font-display text-lg lowercase">{selectedRegions.length} selected</div>
            {selectedTypes.size === 1 ? (
              <>
                <p className="font-mono text-[11px] lowercase text-stone-700 leading-relaxed">
                  editing specs for all <strong>{selectedRegions.length}</strong>{" "}
                  {[...selectedTypes][0]} cells.
                </p>
                {SPECS[[...selectedTypes][0] as CompType].length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">shared specs</div>
                    {SPECS[[...selectedTypes][0] as CompType].map((f) => {
                      const values = new Set(
                        selectedRegions.map((r) => (r.spec ?? defaultSpec(r.type))[f.key] ?? f.options[0]),
                      );
                      const display = values.size === 1 ? [...values][0] : "—mixed—";
                      return (
                        <SpecSelect
                          key={f.key}
                          field={values.size === 1 ? f : { ...f, options: ["—mixed—", ...f.options] }}
                          value={display}
                          onChange={(v) => v !== "—mixed—" && applySpecField(f.key, v)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="font-mono text-[11px] lowercase text-stone-700 leading-relaxed">
                mixed types selected. pick a single component from the palette to unify them, then edit specs.
              </p>
            )}
            <div className="pt-3 border-t border-border">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">current types</div>
              <ul className="font-mono text-[11px] lowercase text-stone-700 space-y-1">
                {Array.from(selectedTypes).map((t) => (
                  <li key={t}>
                    · {t} ({selectedRegions.filter((r) => r.type === t).length})
                    <button
                      onClick={() => selectAllOfType(t)}
                      className="ml-2 text-[10px] uppercase tracking-[0.18em] text-stone-500 hover:text-stone-900"
                    >
                      select all
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border font-mono text-[10px] text-muted-foreground leading-relaxed">
          <div className="uppercase tracking-[0.22em] mb-2">tips</div>
          <p>· click a cell to select</p>
          <p>· shift-click to multi-select</p>
          <p>· click a palette item to assign</p>
          <p>· filter view to focus on one type</p>
        </div>
      </aside>
    </div>
  );
}

function FilterChip({
  active, onClick, label, count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded border
        ${active ? "bg-stone-900 text-stone-50 border-stone-900" : "bg-stone-50/60 text-stone-600 border-stone-300 hover:bg-stone-100"}`}
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-md p-3 analog-shadow-sm">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="font-display text-2xl lowercase mt-1">{value}</div>
    </div>
  );
}
