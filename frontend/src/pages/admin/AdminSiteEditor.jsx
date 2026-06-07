import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/api";

const inputCls = "w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm text-clinic-navy outline-none focus:border-clinic-forest";

export default function AdminSiteEditor() {
  const [status, setStatus] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    page_requested: "/",
    description: "",
    submitter_name: "Clinic Admin",
    submitter_email: "admin@example.com",
    approval_required: true,
  });
  const [files, setFiles] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        adminApi.get("/nova-site-editor/status"),
        adminApi.get("/nova-site-editor/requests"),
      ]);
      setStatus(s.data);
      setRequests(r.data || []);
    } catch (e) {
      toast.error("Failed to load Nova Site Editor status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      Array.from(files || []).forEach((file) => fd.append("files", file));
      await adminApi.post("/nova-site-editor/requests", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Request submitted to Nova");
      setForm((f) => ({ ...f, title: "", description: "" }));
      setFiles([]);
      await load();
    } catch (e2) {
      const detail = e2?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : detail?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-clinic-mist">Loading Nova Site Editor...</div>;

  return (
    <div className="space-y-8" data-testid="admin-site-editor">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Nova Site Editor</div>
        <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Website Change Requests</h1>
        <p className="text-clinic-mist mt-2 max-w-3xl">
          Optional integration for finalized client sites. Submit copy/image/change requests to Nova; attachments are forwarded through Nova's shared asset bucket pipeline.
        </p>
      </div>

      <section className="rounded-3xl bg-white border border-sand-300/70 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-xl font-bold text-clinic-navy">Integration Status</div>
            <div className="text-sm text-clinic-mist mt-1">Intake: {status?.intakeUrl}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${status?.enabled && status?.configured ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            {status?.enabled && status?.configured ? "Enabled" : "Setup required"}
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-5 text-sm">
          <Info label="Site ID" value={status?.siteId || "Not set"} />
          <Info label="Public URL" value={status?.publicSiteUrl || "Not set"} />
          <Info label="Site key" value={status?.siteKeyConfigured ? "Configured" : "Missing"} />
          <Info label="Callback auth" value={status?.callbackConfigured ? "Configured" : "Recommended"} />
        </div>
        {status?.notes?.length > 0 && (
          <div className="mt-5 rounded-2xl bg-sand-100 p-4 text-sm text-clinic-mist space-y-1">
            {status.notes.map((n, i) => <div key={i}>• {n}</div>)}
          </div>
        )}
      </section>

      <form onSubmit={submit} className="rounded-3xl bg-white border border-sand-300/70 p-6 shadow-sm space-y-4">
        <div className="font-display text-xl font-bold text-clinic-navy">Submit a Change Request</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Title"><input className={inputCls} value={form.title} onChange={update("title")} required /></Field>
          <Field label="Page requested"><input className={inputCls} value={form.page_requested} onChange={update("page_requested")} placeholder="/services" /></Field>
          <Field label="Submitter name"><input className={inputCls} value={form.submitter_name} onChange={update("submitter_name")} required /></Field>
          <Field label="Submitter email"><input className={inputCls} type="email" value={form.submitter_email} onChange={update("submitter_email")} required /></Field>
        </div>
        <Field label="Description"><textarea className={inputCls} rows={5} value={form.description} onChange={update("description")} required placeholder="Describe the website change, photo swap, copy edit, or issue..." /></Field>
        <Field label="Attachments / photos / screenshots"><input className={inputCls} type="file" multiple onChange={(e) => setFiles(e.target.files)} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-clinic-navy">
          <input type="checkbox" checked={form.approval_required} onChange={update("approval_required")} /> Approval required before final publishing
        </label>
        <button disabled={submitting || !status?.enabled || !status?.configured} className="rounded-full bg-clinic-navy text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
          {submitting ? "Submitting..." : "Submit to Nova"}
        </button>
      </form>

      <section className="rounded-3xl bg-white border border-sand-300/70 p-6 shadow-sm">
        <div className="font-display text-xl font-bold text-clinic-navy mb-4">Recent Requests</div>
        <div className="space-y-3">
          {requests.length === 0 && <div className="text-sm text-clinic-mist">No local requests yet.</div>}
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-sand-300/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold text-clinic-navy">{r.title}</div>
                  <div className="text-xs text-clinic-mist mt-1">{r.page_requested || "/"} • {r.client_request_id}</div>
                </div>
                <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-clinic-mist">{r.status}</span>
              </div>
              {r.error && <div className="text-sm text-red-700 mt-2">{r.error}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block text-sm font-semibold text-clinic-navy space-y-1.5"><span>{label}</span>{children}</label>;
}
function Info({ label, value }) {
  return <div className="rounded-2xl bg-sand-100 p-3"><div className="text-xs uppercase tracking-wide text-clinic-mist">{label}</div><div className="font-semibold text-clinic-navy break-all">{value}</div></div>;
}
