# Veterinary Site Discovery Checklist

Use this before configuring a demo site. The goal is to fetch enough company-specific information to make the template feel branded without rewriting the whole site.

## Required if available

- Practice name
- Short name / common name
- Logo URL or downloaded logo file
- Brand colors from logo/site
- Phone number
- Email address
- Physical address
- Hours of operation
- Existing website URL

## Strongly recommended

- Team members
  - name
  - role/title
  - bio
  - photo
- Social links
- Services list
- Animals/species served
- About/practice story
- Google Business Profile link
- Testimonials/reviews suitable for demo use

## Vendor/external links

Many veterinary sites use external vendors through CNAMEs or hosted shops. Capture these as outbound links, not internal routes.

- Online pharmacy
- Online store
- Booking link
- Online forms
- Client portal link if external

Common labels to look for:

- Pharmacy
- Online Pharmacy
- Shop Online
- Online Store
- Refill Medication
- Request Appointment
- Book Online
- Forms
- New Client Form

## Discovery output suggestion

Create a short report or JSON object containing:

```json
{
  "sourceUrls": [],
  "practiceName": "",
  "logoCandidates": [],
  "colorCandidates": [],
  "contact": {},
  "hours": [],
  "team": [],
  "externalLinks": {
    "store": "",
    "pharmacy": "",
    "appointment": "",
    "onlineForms": ""
  },
  "missing": []
}
```

Use placeholders in `site.config.json` when data is missing. Demo quality is acceptable; obvious company-specific identity should be correct.
