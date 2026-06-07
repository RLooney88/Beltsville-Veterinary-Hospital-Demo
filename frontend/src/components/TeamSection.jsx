import React from "react";
import { team } from "../site/siteConfig";

const FALLBACK_TEAM = [
  {
    name: "Veterinarian Name",
    role: "Veterinarian",
    bio: "Short professional bio placeholder.",
    image: "",
  },
  {
    name: "Practice Manager Name",
    role: "Practice Manager",
    bio: "Short team bio placeholder.",
    image: "",
  },
];

function initials(name = "Team") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "VT";
}

export default function TeamSection() {
  const members = team?.length ? team : FALLBACK_TEAM;

  return (
    <section className="mt-24" data-testid="team-section">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Our Team</div>
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3 max-w-2xl">
        Meet the people caring for your pet.
      </h2>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {members.map((m, i) => (
          <article
            key={`${m.name}-${i}`}
            className="group bg-white rounded-[1.5rem] border border-sand-300/60 overflow-hidden transition-transform duration-300 hover:-translate-y-1.5"
            data-testid={`team-card-${i}`}
          >
            <div className="aspect-[4/5] overflow-hidden bg-sand-200 grid place-items-center">
              {m.image || m.img ? (
                <img
                  src={m.image || m.img}
                  alt={m.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-clinic-sage text-clinic-forest grid place-items-center font-display text-3xl font-bold">
                  {initials(m.name)}
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="font-display font-bold text-clinic-navy">{m.name}</div>
              <div className="text-xs uppercase tracking-widest text-clinic-forest font-semibold mt-1">{m.role}</div>
              {m.bio && <p className="mt-3 text-sm text-clinic-mist leading-relaxed line-clamp-3">{m.bio}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
