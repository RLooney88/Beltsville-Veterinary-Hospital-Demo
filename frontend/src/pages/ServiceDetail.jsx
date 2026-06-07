import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Phone, PawPrint } from "lucide-react";
import { ALL_SERVICES } from "../data/services";
import InlineCTA from "../components/InlineCTA";

// Map a service's animal key to the CTA's parent intent switch rule.
const ANIMAL_TO_INTENT = {
  dogs: "dogs",
  cats: "cats",
  rabbits: "critters",
  guinea_pigs: "critters",
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const service = ALL_SERVICES[slug];

  if (!service) return <Navigate to="/services" replace />;

  const forceIntent = ANIMAL_TO_INTENT[service.animalKey] || null;

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 pt-12" data-testid={`service-detail-${slug}`}>
      <Link to="/services" className="inline-flex items-center gap-2 text-sm font-bold text-clinic-forest hover:text-clinic-navy mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to services
      </Link>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden bg-sand-200 h-64 sm:h-80 mb-8">
        <img
          src={service.image}
          alt={service.title}
          className="h-full w-full object-cover"
          style={service.detailObjectPosition ? { objectPosition: service.detailObjectPosition } : undefined}
        />
      </div>

      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">{service.animalLabel}</div>
      <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-clinic-navy mt-2 leading-[1.08]">
        {service.title}
      </h1>
      <p className="mt-4 text-lg text-clinic-mist leading-relaxed">
        {service.detail || service.summary}
      </p>

      <InlineCTA forceIntent={forceIntent} />
    </div>
  );
}
