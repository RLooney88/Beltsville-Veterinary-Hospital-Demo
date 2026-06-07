import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-28 text-center" data-testid="not-found">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">404</div>
      <h1 className="font-display text-5xl font-extrabold text-clinic-navy mt-3">Page not found</h1>
      <p className="mt-4 text-clinic-mist">That page wandered off. Let&rsquo;s head back.</p>
      <Link to="/" className="mt-8 inline-flex bg-clinic-red hover:bg-clinic-red-hover text-white rounded-full px-6 py-3 font-semibold">
        Back home
      </Link>
    </div>
  );
}
