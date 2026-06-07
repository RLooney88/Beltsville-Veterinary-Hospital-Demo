import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, setAdminToken } from "../../lib/api";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await adminApi.post("/admin/login", { email, password });
      setAdminToken(data.access_token);
      toast.success(`Welcome back, ${data.user?.name || "admin"}.`);
      navigate("/admin", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 grid place-items-center px-6" data-testid="admin-login">
      <div className="w-full max-w-md bg-white rounded-[1.5rem] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.06)] border border-sand-300/60">
        <div className="h-12 w-12 rounded-2xl bg-clinic-navy text-sand-50 grid place-items-center mb-6">
          <Lock className="h-5 w-5" />
        </div>
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">
          Smart Site Admin
        </div>
        <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Sign in</h1>
        <p className="text-sm text-clinic-mist mt-1">Manage surfaces, switches and leads.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" data-testid="admin-login-form">
          <div>
            <label className="text-xs uppercase tracking-[0.16em] font-bold text-clinic-navy">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-sand-300 bg-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-clinic-forest focus:ring-2 focus:ring-clinic-forest/20"
              data-testid="admin-email-input"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.16em] font-bold text-clinic-navy">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-sand-300 bg-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-clinic-forest focus:ring-2 focus:ring-clinic-forest/20"
              data-testid="admin-password-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-clinic-navy hover:bg-clinic-navy-hover text-white rounded-full py-3 font-semibold transition-colors disabled:opacity-60"
            data-testid="admin-login-submit"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-clinic-mist">
          <Link to="/" className="hover:text-clinic-navy">← Back to site</Link>
        </div>
      </div>
    </div>
  );
}
