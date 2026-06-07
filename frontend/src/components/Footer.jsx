import React from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, ShoppingBag, Pill, FileText } from "lucide-react";
import { toast } from "sonner";
import { useSmartSite } from "../context/SmartSiteContext";
import { brand, contact, features, formatAddress, getExternalLinks, hours, links, practice } from "../site/siteConfig";

const socialLinks = [
  links.facebook ? { href: links.facebook, label: "Facebook", Icon: Facebook } : null,
  links.instagram ? { href: links.instagram, label: "Instagram", Icon: Instagram } : null,
  links.linkedin ? { href: links.linkedin, label: "LinkedIn", Icon: Linkedin } : null,
].filter(Boolean);

const externalIcon = {
  "Online Store": ShoppingBag,
  Pharmacy: Pill,
  Forms: FileText,
};

export default function Footer() {
  const { clearIntent } = useSmartSite();
  const addressLines = formatAddress(contact.address, { multiline: true });
  const externalLinks = getExternalLinks();

  const onClear = async () => {
    await clearIntent();
    toast.success("Intent cleared. Site reset to neutral.");
  };

  return (
    <footer className="bg-clinic-navy text-sand-100 mt-20" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3">
            <img src={brand.logo} alt={brand.logoAlt || practice.name} className="h-12 w-auto bg-white rounded-xl p-1.5" />
            <div>
              <div className="font-display font-extrabold text-lg">{practice.displayLines?.[0] || practice.name}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-sand-200/80">{practice.displayLines?.[1] || practice.shortName}</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-sand-100/75 leading-relaxed">
            {practice.description}
          </p>
          {(socialLinks.length > 0 || externalLinks.length > 0) && (
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              {socialLinks.map(({ href, label, Icon }) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" data-testid={`footer-${label.toLowerCase()}`}>
                  <Icon className="h-4 w-4" />
                </a>
              ))}
              {externalLinks.map(({ href, label }) => {
                const Icon = externalIcon[label] || ShoppingBag;
                return (
                  <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" data-testid={`footer-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-display font-bold text-base mb-4">Explore</h4>
          <ul className="space-y-2 text-sm text-sand-100/80">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/services" className="hover:text-white">Services</Link></li>
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/appointment" className="hover:text-white">Request Visit</Link></li>
            {features.clientPortal !== false && <li><Link to="/portal/login" className="hover:text-white">Client Portal</Link></li>}
            {externalLinks.map((link) => (
              <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer" className="hover:text-white">{link.label}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold text-base mb-4">Hours</h4>
          <ul className="space-y-1 text-sm text-sand-100/80">
            {hours.map(([day, value]) => <li key={day}>{day}: {value}</li>)}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-bold text-base mb-4">Find us</h4>
          <ul className="space-y-3 text-sm text-sand-100/80">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{addressLines[0]}<br />{addressLines[1]}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> <a href={contact.phoneHref} className="hover:text-white">{contact.phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> <a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-sand-100/60">
          <div>© {new Date().getFullYear()} {practice.name}.</div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClear}
              className="hover:text-white transition-colors"
              data-testid="footer-clear-intent"
              title="Reset intent signals for the current session (demo helper)"
            >
              Clear
            </button>
            <Link to="/admin/login" className="hover:text-white" data-testid="footer-admin-link">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
