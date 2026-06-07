import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { portalApi, setPortalToken } from "../../lib/portalApi";
import { toast } from "sonner";

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await portalApi.post("/login", { email, password });
      setPortalToken(data.access_token);
      navigate("/portal");
    } catch {
      toast.error("Invalid email or password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-sand-300/60 p-8 shadow-sm" data-testid="portal-login">
          <div className="h-12 w-12 rounded-2xl bg-clinic-red grid place-items-center mb-6">
            <PawPrint className="h-5 w-5 text-white" />
          </div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Client Portal</div>
          <h1 className="font-display text-2xl font-extrabold text-clinic-navy mt-1">Welcome back</h1>
          <p className="text-sm text-clinic-mist mt-1">Sign in to see your pet's health records and appointments.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mt-1 rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-clinic-forest"
                data-testid="portal-email"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full mt-1 rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-clinic-forest"
                data-testid="portal-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-clinic-navy hover:bg-clinic-navy/90 text-white rounded-full py-3 font-semibold disabled:opacity-50"
              data-testid="portal-submit"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-clinic-forest hover:text-clinic-navy font-semibold">Back to site</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
