import React from "react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { contact, formatAddress, hours } from "../site/siteConfig";

export default function ContactSection() {
  const addressLines = formatAddress(contact.address, { multiline: true });

  return (
    <section className="mt-24 grid gap-8 lg:grid-cols-2" data-testid="contact-section">
      <div className="bg-clinic-red text-sand-50 rounded-[2rem] p-10 lg:p-14 relative overflow-hidden grain">
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-amber">Visit Us</div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3">We hope to see you soon.</h2>
        <div className="mt-8 space-y-5 relative z-10">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-clinic-amber mt-0.5" />
            <div>
              <div className="font-semibold">{addressLines[0]}</div>
              <div className="text-sand-50/80">{addressLines[1]}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-clinic-amber mt-0.5" />
            <a href={contact.phoneHref} className="font-semibold hover:underline underline-offset-4" data-testid="contact-phone">
              {contact.phone}
            </a>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-clinic-amber mt-0.5" />
            <a href={`mailto:${contact.email}`} className="font-semibold hover:underline underline-offset-4" data-testid="contact-email">
              {contact.email}
            </a>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-clinic-amber/25 blur-3xl" />
        <div className="absolute -left-16 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="bg-clinic-cream rounded-[2rem] p-10 lg:p-14 border border-clinic-peachDeep/60">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">
          <Clock className="h-3.5 w-3.5" /> Hours
        </div>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-clinic-navy mt-3">
          Open when your pets need care.
        </h3>
        <ul className="mt-8 divide-y divide-sand-300/70">
          {hours.map(([day, hrs]) => (
            <li key={day} className="flex items-center justify-between py-3 text-sm">
              <span className="font-semibold text-clinic-navy">{day}</span>
              <span className="text-clinic-mist">{hrs}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
