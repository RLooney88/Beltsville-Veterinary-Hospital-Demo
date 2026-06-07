# Nova Site Editor Integration Playbook

This template includes an optional Nova Site Editor integration for finalized client sites.

## When to enable it

Do **not** enable Nova Site Editor for quick prospecting/demo sites by default. Demos should deploy fast with the static/template assets already in the repo.

Enable it when a site is being finalized for a real client and should support ongoing website change requests from the site admin.

## Asset storage model

### Baseline template images

Template/default images live in the repo and deploy with the site:

```txt
frontend/public/images/animals/
frontend/public/brand/
```

Use these for generated hero/service/card imagery and placeholder brand assets.

### Uploaded client/request assets

Uploaded request assets (screenshots, replacement photos, PDFs, mockups) are submitted to Nova. Nova owns persistence and uses the shared bucket convention:

```txt
gs://nova-site-assets/<siteId>/<requestId>/<safeFilename>
```

Do not create a bucket per site unless there is a specific compliance/isolation reason. The normal model is one shared Nova bucket with per-site prefixes.

## Site-side env vars

Set these on the finalized client site's Railway service:

```txt
EDIT_REQUEST_ENABLED=true
EDIT_REQUEST_API_URL=https://nova-site-editor-production.up.railway.app/api/site-edit-request
EDIT_REQUEST_SITE_ID=<stable-site-id>
EDIT_REQUEST_SITE_KEY=<shared-site-key-or-generated-secret>
EDIT_REQUEST_CALLBACK_AUTH=<shared-callback-secret>
EDIT_REQUEST_CLIENT_NAME=<Client / Practice Name>
PUBLIC_SITE_URL=https://client-site.example.com
```

Optional:

```txt
EDIT_REQUEST_MAX_ATTACHMENT_BYTES=10485760
```

For prospecting/demo sites, leave `EDIT_REQUEST_ENABLED=false` or unset.

## Admin UX

When enabled/configured, the site admin can open:

```txt
/admin/site-editor
```

They can submit:

- title
- requested page
- description
- submitter name/email
- approval-required flag
- optional files/photos/screenshots

The backend forwards the request to Nova intake:

```txt
POST https://nova-site-editor-production.up.railway.app/api/site-edit-request
```

## Local site endpoints

### `GET /api/nova-site-editor/status`

Admin-only. Returns whether the integration is enabled/configured and which env vars are missing.

### `GET /api/nova-site-editor/requests`

Admin-only. Lists local audit/status rows.

### `POST /api/nova-site-editor/requests`

Admin-only multipart form endpoint. Forwards request + files to Nova.

### `POST /api/nova-site-editor/callback`

Public callback endpoint for Nova. If `EDIT_REQUEST_CALLBACK_AUTH` is set, Nova must call it with:

```http
Authorization: Bearer <EDIT_REQUEST_CALLBACK_AUTH>
```

The callback updates the local audit row by `clientRequestId` or Nova request id.

## Nova payload shape

The site submits a payload like:

```json
{
  "siteId": "client-site-id",
  "siteKey": "client-site-key",
  "clientRequestId": "client-site-id-20260604140300-abc123",
  "requestType": "new_edit",
  "submitter": {
    "name": "Clinic Admin",
    "email": "admin@example.com"
  },
  "clientName": "Client Practice Name",
  "website": "https://client-site.example.com",
  "title": "Update homepage CTA",
  "pageRequested": "/",
  "description": "Please change the CTA copy and replace the hero photo.",
  "approvalRequired": true,
  "images": [],
  "attachments": [
    {
      "filename": "screenshot.png",
      "contentType": "image/png",
      "contentBase64": "..."
    }
  ],
  "meta": {
    "siteId": "client-site-id",
    "source": "vet-site-admin",
    "callbackUrl": "https://client-site.example.com/api/nova-site-editor/callback"
  },
  "callbackUrl": "https://client-site.example.com/api/nova-site-editor/callback"
}
```

Nova stores/normalizes attachments using the shared bucket path convention.

## New site setup checklist

1. Duplicate the template repo for the client site.
2. Configure normal site settings and deploy demo/prospecting version.
3. Keep Nova disabled during early prospecting unless explicitly needed.
4. When finalizing the site:
   - choose stable `EDIT_REQUEST_SITE_ID`
   - generate `EDIT_REQUEST_SITE_KEY`
   - generate `EDIT_REQUEST_CALLBACK_AUTH`
   - set `PUBLIC_SITE_URL`
   - set `EDIT_REQUEST_ENABLED=true`
5. Redeploy Railway.
6. Log into `/admin/site-editor` and confirm status shows Enabled.
7. Submit a test request with a small screenshot/photo.
8. Confirm it appears in Nova operator queue.
9. Confirm Nova callback updates the local request row when Nova sends status updates.

## Security notes

- Admin submit endpoint requires the site's admin JWT.
- Callback endpoint validates bearer auth when `EDIT_REQUEST_CALLBACK_AUTH` is set.
- Local DB stores only audit/status plus sanitized attachment metadata; file bytes are forwarded to Nova and not retained locally.
- Do not expose `EDIT_REQUEST_SITE_KEY` or callback auth to the frontend.
