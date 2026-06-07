import rawConfig from "./site.config.json";

const FALLBACK_CONFIG = {
  practice: {
    name: "Beltsville Veterinary Hospital",
    shortName: "Beltsville Vet",
    displayLines: ["Veterinary", "Clinic"],
    tagline: "Modern veterinary care with a long-standing Beltsville history.",
    description: "Beltsville Veterinary Hospital provides compassionate wellness care, same-day sick visits, diagnostics, dental care, surgery, and boarding for dogs and cats in Beltsville, MD.",
    serviceArea: "Beltsville, MD",
  },
  brand: {
    logo: "/brand/bvh-logo.svg",
    logoAlt: "Beltsville Veterinary Hospital logo",
    colors: {
      light: "#F7F3EA",
      dark: "#14345B",
      accent: "#E15D3B",
      accentLight: "#E7F0F0",
    },
  },
  contact: {
    phone: "(301) 937-3020",
    phoneHref: "tel:+13019373020",
    email: "info@beltsvillevets.com",
    address: {
      street: "4246 Powder Mill Rd",
      line2: "",
      city: "Beltsville",
      state: "MD",
      zip: "20705",
      country: "US",
    },
  },
  hours: [
    ["Monday", "8:00 AM – 6:00 PM"],
    ["Tuesday", "8:00 AM – 6:00 PM"],
    ["Wednesday", "8:00 AM – 6:00 PM"],
    ["Thursday", "8:00 AM – 6:00 PM"],
    ["Friday", "8:00 AM – 6:00 PM"],
    ["Saturday", "8:00 AM – 2:00 PM"],
    ["Sunday", "Closed"],
  ],
  links: {},
  team: [],
  features: {},
};

function mergeConfig(base, override) {
  const output = { ...base, ...override };
  output.practice = { ...base.practice, ...(override.practice || {}) };
  output.brand = { ...base.brand, ...(override.brand || {}) };
  output.brand.colors = { ...base.brand.colors, ...((override.brand && override.brand.colors) || {}) };
  output.contact = { ...base.contact, ...(override.contact || {}) };
  output.contact.address = { ...base.contact.address, ...((override.contact && override.contact.address) || {}) };
  output.links = { ...base.links, ...(override.links || {}) };
  output.features = { ...base.features, ...(override.features || {}) };
  output.hours = override.hours && override.hours.length ? override.hours : base.hours;
  output.team = override.team || base.team;
  return output;
}

export const siteConfig = mergeConfig(FALLBACK_CONFIG, rawConfig || {});

export const practice = siteConfig.practice;
export const brand = siteConfig.brand;
export const contact = siteConfig.contact;
export const links = siteConfig.links;
export const features = siteConfig.features;
export const hours = siteConfig.hours;
export const team = siteConfig.team;

export function formatAddress(address = contact.address, { multiline = false } = {}) {
  const line1 = [address.street, address.line2].filter(Boolean).join(", ");
  const line2 = [address.city, address.state, address.zip].filter(Boolean).join(" ");
  if (multiline) return [line1, line2].filter(Boolean);
  return [line1, line2].filter(Boolean).join(", ");
}

export function getExternalLinks() {
  return [
    features.storeLink && links.store ? { label: "Online Store", href: links.store } : null,
    features.pharmacyLink && links.pharmacy ? { label: "Pharmacy", href: links.pharmacy } : null,
    features.onlineFormsLink && links.onlineForms ? { label: "Forms", href: links.onlineForms } : null,
  ].filter(Boolean);
}
