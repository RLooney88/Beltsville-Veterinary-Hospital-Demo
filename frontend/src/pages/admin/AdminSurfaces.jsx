import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Save, Trash2 } from "lucide-react";

const INTENT_OPTIONS = ["", "dogs", "cats", "critters"];
const SUB_OPTIONS = [
  "",
  "new_puppy",
  "new_kitten",
  "wellness",
  "health_concerns",
  "senior",
  "treatments",
  "husbandry",
];

export default function AdminSurfaces() {
  const [surfaces, setSurfaces] = useState([]);
  const [openSurfaceId, setOpenSurfaceId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await adminApi.get("/admin/surfaces");
    setSurfaces(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const patchSurface = async (id, patch) => {
    await adminApi.patch(`/admin/surfaces/${id}`, patch);
    toast.success("Surface updated");
    await load();
  };

  const createSwitch = async (surfaceId) => {
    await adminApi.post("/admin/switches", {
      surface_id: surfaceId,
      name: "New switch",
      rule: { intent: null, sub_intent: null },
      content: {},
      priority: 100,
      active: true,
    });
    await load();
  };

  const patchSwitch = async (id, patch) => {
    await adminApi.patch(`/admin/switches/${id}`, patch);
    await load();
  };

  const deleteSwitch = async (id) => {
    if (!window.confirm("Delete this switch?")) return;
    await adminApi.delete(`/admin/switches/${id}`);
    toast.success("Switch deleted");
    await load();
  };

  return (
    <div data-testid="admin-surfaces">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">
        Smart Site Architecture
      </div>
      <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Surfaces &amp; Switches</h1>
      <p className="text-clinic-mist text-sm mt-1 max-w-2xl">
        Surfaces are dynamic sections on the site. Switches are rules that swap content into those surfaces based on the visitor&rsquo;s inferred intent.
      </p>

      <div className="mt-8 space-y-3">
        {loading ? (
          <div className="text-clinic-mist">Loading…</div>
        ) : (
          surfaces.map((s) => (
            <SurfaceCard
              key={s.id}
              surface={s}
              isOpen={openSurfaceId === s.id}
              onToggle={() => setOpenSurfaceId((curr) => (curr === s.id ? null : s.id))}
              onAddSwitch={() => createSwitch(s.id)}
              onPatchSwitch={patchSwitch}
              onDeleteSwitch={deleteSwitch}
              onPatchSurface={(p) => patchSurface(s.id, p)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SurfaceCard({ surface, isOpen, onToggle, onAddSwitch, onPatchSwitch, onDeleteSwitch, onPatchSurface }) {
  const [activeLocal, setActiveLocal] = useState(surface.active);
  return (
    <div className="bg-white rounded-2xl border border-sand-300/60 overflow-hidden" data-testid={`surface-card-${surface.slug}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-5 text-left"
        onClick={onToggle}
        data-testid={`surface-toggle-${surface.slug}`}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="h-4 w-4 text-clinic-forest" /> : <ChevronRight className="h-4 w-4 text-clinic-forest" />}
          <div>
            <div className="font-display font-bold text-clinic-navy">{surface.name}</div>
            <div className="text-xs text-clinic-mist">
              <code className="bg-sand-100 px-1.5 py-0.5 rounded">{surface.slug}</code> · page: {surface.page} · {surface.switches.length} switches
            </div>
          </div>
        </div>
        <label className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-clinic-mist">Active</span>
          <input
            type="checkbox"
            checked={activeLocal}
            onChange={(e) => {
              setActiveLocal(e.target.checked);
              onPatchSurface({ active: e.target.checked });
            }}
          />
        </label>
      </button>

      {isOpen && (
        <div className="border-t border-sand-300/60 p-6 bg-sand-50/60">
          <details className="mb-5 rounded-xl bg-white border border-sand-300/60">
            <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-clinic-navy">Default content (JSON)</summary>
            <DefaultContentEditor surface={surface} onSave={(d) => onPatchSurface({ default_content: d })} />
          </details>

          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Switches</div>
            <button
              onClick={onAddSwitch}
              className="inline-flex items-center gap-1.5 rounded-full bg-clinic-navy text-white px-4 py-1.5 text-xs font-semibold"
              data-testid={`surface-add-switch-${surface.slug}`}
            >
              <Plus className="h-3.5 w-3.5" /> New switch
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {surface.switches.length === 0 && (
              <div className="text-xs text-clinic-mist">No switches yet, visitors will see the default content.</div>
            )}
            {surface.switches.map((sw) => (
              <SwitchEditor key={sw.id} switchItem={sw} onPatch={(p) => onPatchSwitch(sw.id, p)} onDelete={() => onDeleteSwitch(sw.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultContentEditor({ surface, onSave }) {
  const [fields, setFields] = useState(surface.default_content || {});
  const updateField = (key, val) => setFields((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="p-4 space-y-3">
      {Object.entries(fields).map(([key, val]) => (
        <ContentFieldEditor key={key} fieldKey={key} value={val} onChange={(v) => updateField(key, v)} />
      ))}
      <button
        onClick={() => onSave(fields)}
        className="inline-flex items-center gap-1.5 rounded-full bg-clinic-forest text-white px-4 py-1.5 text-xs font-semibold"
      >
        <Save className="h-3.5 w-3.5" /> Save defaults
      </button>
    </div>
  );
}

function ContentFieldEditor({ fieldKey, value, onChange }) {
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return <JsonFieldEditor fieldKey={fieldKey} value={value} onChange={onChange} />;
  }
  const isLong = typeof value === "string" && value.length > 80;
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">{fieldKey}</label>
      {isLong ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full mt-1 rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-clinic-forest"
        />
      ) : (
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}
    </div>
  );
}

function JsonFieldEditor({ fieldKey, value, onChange }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState(null);
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">{fieldKey} (JSON)</label>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setErr(null); }}
        onBlur={() => {
          try { onChange(JSON.parse(text)); setErr(null); }
          catch (e) { setErr(e.message); }
        }}
        rows={6}
        className="w-full mt-1 font-mono text-xs rounded-lg border border-sand-300 bg-sand-50 p-3 focus:outline-none focus:border-clinic-forest"
      />
      {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
    </div>
  );
}

function SwitchEditor({ switchItem, onPatch, onDelete }) {
  const [name, setName] = useState(switchItem.name);
  const [priority, setPriority] = useState(switchItem.priority);
  const [active, setActive] = useState(switchItem.active);
  const [intent, setIntent] = useState(switchItem.rule?.intent || "");
  const [sub, setSub] = useState(switchItem.rule?.sub_intent || "");
  const [contentFields, setContentFields] = useState(switchItem.content || {});

  const updateContentField = (key, val) => setContentFields((prev) => ({ ...prev, [key]: val }));

  const save = () => {
    onPatch({
      name,
      priority: Number(priority) || 100,
      active,
      rule: {
        intent: intent || null,
        sub_intent: sub || null,
      },
      content: contentFields,
    });
  };

  return (
    <div className="bg-white border border-sand-300/60 rounded-xl p-4" data-testid={`switch-editor-${switchItem.id}`}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">Priority</label>
            <input value={priority} type="number" onChange={(e) => setPriority(e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-end gap-2 text-xs pb-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">Rule: Intent</label>
          <select value={intent} onChange={(e) => setIntent(e.target.value)} className={inputCls}>
            {INTENT_OPTIONS.map((o) => <option key={o || "any"} value={o}>{o || "(any)"}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">Rule: Sub-intent</label>
          <select value={sub} onChange={(e) => setSub(e.target.value)} className={inputCls}>
            {SUB_OPTIONS.map((o) => <option key={o || "any"} value={o}>{o || "(any)"}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">Content</div>
        {Object.entries(contentFields).map(([key, val]) => (
          <ContentFieldEditor key={key} fieldKey={key} value={val} onChange={(v) => updateContentField(key, v)} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 text-red-600 text-xs font-semibold"
          data-testid={`switch-delete-${switchItem.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        <button
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-full bg-clinic-forest hover:bg-clinic-forest-hover text-white px-4 py-1.5 text-xs font-semibold"
          data-testid={`switch-save-${switchItem.id}`}
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full mt-1 rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-clinic-forest";
