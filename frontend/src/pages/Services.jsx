import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PawPrint, AlertTriangle, ChevronRight, Dog, Cat, Rabbit } from "lucide-react";
import { useSmartSite } from "../context/SmartSiteContext";
import { useSurface } from "../hooks/useSurface";
import InlineCTA from "../components/InlineCTA";
import { SERVICES_BY_ANIMAL } from "../data/services";

const TABS = [
  { key: "dogs", label: "Dogs", Icon: Dog },
  { key: "cats", label: "Cats", Icon: Cat },
  { key: "rabbits", label: "Rabbits", Icon: Rabbit },
  { key: "guinea_pigs", label: "Guinea Pigs", Icon: PawPrint },
];

function ServiceCard({ service }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="group bg-white rounded-2xl border border-sand-300/60 overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)]"
      data-testid={`service-card-${service.slug}`}
    >
      <div className="h-44 overflow-hidden bg-sand-200">
        <img
          src={service.image}
          alt={service.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={service.objectPosition ? { objectPosition: service.objectPosition } : undefined}
          loading="lazy"
        />
      </div>
      <div className="p-5">
        <h3 className="font-display font-bold text-clinic-navy text-base">{service.title}</h3>
        <p className="text-sm text-clinic-mist mt-1.5 line-clamp-2">{service.summary}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-clinic-red group-hover:text-clinic-red-hover transition-colors">
          Learn more <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function UrgentCard({ service }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="group flex items-start gap-4 bg-white rounded-xl border border-sand-300/60 p-4 hover:border-clinic-red/30 hover:bg-clinic-red-soft/30 transition-all duration-200"
      data-testid={`urgent-card-${service.slug}`}
    >
      <div className="h-10 w-10 rounded-lg bg-amber-50 grid place-items-center shrink-0 group-hover:bg-clinic-red-soft">
        <AlertTriangle className="h-4 w-4 text-amber-500 group-hover:text-clinic-red" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm text-clinic-navy">{service.title}</div>
        <p className="text-xs text-clinic-mist mt-0.5 line-clamp-2">{service.summary}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-clinic-mist shrink-0 mt-1 group-hover:text-clinic-red transition-colors" />
    </Link>
  );
}

function AnimalServicesSection({ animalKey }) {
  const animal = SERVICES_BY_ANIMAL[animalKey];
  if (!animal) return null;

  return (
    <div data-testid={`services-${animalKey}`}>
      {/* Preventive */}
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest mt-10 mb-6">
        Preventive & Routine Care
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {animal.preventive.map((s) => (
          <ServiceCard key={s.slug} service={s} />
        ))}
      </div>

      {/* Urgent */}
      <div className="mt-14">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-amber-700">
            Urgent Care & Common Illness
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {animal.urgent.map((s) => (
            <UrgentCard key={s.slug} service={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Services() {
  const { parentIntent } = useSmartSite();
  const { content: hero } = useSurface("services_hero");
  const [searchParams] = useSearchParams();

  // Priority: URL ?tab= param > parent intent > null
  const tabParam = searchParams.get("tab");
  const intentToTab = parentIntent === "dogs" ? "dogs"
    : parentIntent === "cats" ? "cats"
    : parentIntent === "critters" ? "rabbits"
    : null;
  const initialTab = tabParam && SERVICES_BY_ANIMAL[tabParam] ? tabParam : intentToTab;

  const [activeTab, setActiveTab] = useState(initialTab);

  // Update tab when intent changes (e.g., navigated from dropdown)
  React.useEffect(() => {
    if (intentToTab && !tabParam) setActiveTab(intentToTab);
  }, [intentToTab, tabParam]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12" data-testid="services-page">
      {/* Dynamic hero - swaps per active tab */}
      {hero?.image_url && (() => {
        const tabHero = (activeTab && hero.by_animal && hero.by_animal[activeTab]) || {};
        const heroImage = tabHero.image_url || hero.image_url;
        const heroPos = tabHero.imagePosition || hero.imagePosition;
        const heroEyebrow = tabHero.eyebrow || hero.eyebrow || "Our Services";
        const heroHeadline = tabHero.headline || hero.headline || "Complete care for every member of your family.";
        const heroSubheadline = tabHero.subheadline || hero.subheadline || "Select your pet type to see the services we offer, or browse everything below.";
        return (
          <div className="rounded-2xl overflow-hidden h-64 sm:h-72 mb-8 relative" data-testid="services-hero">
            <img
              key={heroImage}
              src={heroImage}
              alt=""
              className="h-full w-full object-cover transition-opacity duration-500"
              style={heroPos ? { objectPosition: heroPos } : undefined}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-clinic-navy/80 via-clinic-navy/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-10">
              <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-amber">
                {heroEyebrow}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-sand-50 mt-2 max-w-2xl leading-[1.06]">
                {heroHeadline}
              </h1>
              <p className="mt-3 text-sand-100/85 max-w-lg text-base">
                {heroSubheadline}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Animal tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(activeTab === key ? null : key)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold border transition-all ${
              activeTab === key
                ? "bg-clinic-navy text-white border-clinic-navy"
                : "bg-white text-clinic-navy border-sand-300/60 hover:border-clinic-navy/30"
            }`}
            data-testid={`services-tab-${key}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab ? (
        <AnimalServicesSection animalKey={activeTab} />
      ) : (
        // Show all animals
        Object.entries(SERVICES_BY_ANIMAL).map(([key, animal]) => (
          <div key={key} className="mt-14">
            <button
              onClick={() => setActiveTab(key)}
              className="inline-flex items-center gap-2 text-2xl font-display font-bold text-clinic-navy hover:text-clinic-red transition-colors"
            >
              {animal.label}
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {animal.preventive.slice(0, 4).map((s) => (
                <ServiceCard key={s.slug} service={s} />
              ))}
            </div>
          </div>
        ))
      )}

      <InlineCTA />
    </div>
  );
}
