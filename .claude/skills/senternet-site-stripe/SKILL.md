---
name: senternet-site-stripe
description: Wire up Stripe payments through Firebase Functions — hosted Checkout or embedded Payment Element, with license-token, receipt-email, or signed-download-URL fulfillment.
---

# Stripe Payments via Firebase Functions

Add Stripe payments to a site using Firebase Cloud Functions v2. Stores the Stripe secret and webhook signing secret in Firebase Secret Manager, grants the runtime service account the right permissions, scaffolds the Checkout/webhook functions, and wires the webhook up to deliver whatever the purchase unlocks.

The integration has two independent choices, made per site in step 2:

- **Checkout shape** — **hosted** (server creates a Checkout Session and the browser redirects to Stripe's hosted page) or **embedded** (Stripe Payment Element rendered inline on your own page).
- **Fulfillment** — what `checkout.session.completed` does: sign a **JWT entitlement token** (desktop-app licensing), send a **receipt email**, email a **signed download URL** (time-limited link to a private file), or **none** (Stripe receipt only).

These compose. The two reference implementations this skill is distilled from:

- **premail** — hosted Checkout + fixed price IDs (monthly/annual recurring + one-time lifetime) + JWT entitlement tokens. The Mac app stores the signed token and re-validates it against Stripe via a refresh endpoint.
- **beeready** — embedded Payment Element + dynamic `price_data` amounts (donations) + receipt email via Resend.

A third common shape (comoji): hosted Checkout + one fixed one-time price + a receipt email carrying a **signed download URL** to a private DMG.

## Prerequisites

- `/senternet-site-firebase` must already be set up — this skill reads `.firebaserc` for project IDs.
- `/senternet-site-gcloud-auth` must have been run to authenticate this machine.
- **Receipt-email and signed-download-URL fulfillment require `/senternet-site-email-resend`** — they reuse its `sendResendEmail` helper and the `RESEND_API_KEY` secret. Set that up first (or run it as part of this skill). **Order recovery (step 8f)** also depends on Resend (for the OTP email).
- **Order recovery with App Check** optionally depends on `/senternet-recaptcha-enterprise` to gate the recovery endpoint against abuse.
- A Stripe account. You will need the **secret key** and a **webhook signing secret** from the Stripe Dashboard; for the embedded checkout shape you also need the **publishable key**.
- The **Stripe CLI** (`brew install stripe/stripe-cli/stripe`, then `stripe login`) for local sandbox testing in step 11 — forwards webhooks to the emulator and fires test events.

## Steps

### 1. Read `.firebaserc` to determine the prod project ID

```bash
cat .firebaserc
```

Extract the prod project ID (the value of `"prod"` or `"default"`). Use this as `$PROJECT_ID` throughout. Confirm with the user before proceeding.

### 2. Gather inputs before doing anything side-effectful

Ask the user for all of the following up front. Do not proceed until they are confirmed.

- **Checkout shape** — `hosted` or `embedded`.
  - `hosted`: no frontend Stripe SDK; the browser is redirected to Stripe. Simplest, and the right default for selling a license or a fixed product.
  - `embedded`: renders the Payment Element on your page; needs `@stripe/stripe-js` + `@stripe/react-stripe-js` in the site root. Use when you want the payment UI to stay on your domain (e.g. a donation widget with custom amount selection).
- **Pricing** — either **fixed price IDs** created in the Stripe Dashboard (one per plan/product), or a **dynamic amount** passed from the client and built into `price_data` at request time (donations / pay-what-you-want).
- **Mode** per price — `payment` (one-time) or `subscription` (recurring). A site can mix both (premail sells monthly/annual as `subscription` and lifetime as `payment`).
- **Fulfillment** — one of:
  - `jwt` — sign an RS256 entitlement token the client app stores and re-validates. For desktop/native apps that must verify entitlement, possibly offline. Pulls in the activation/refresh/restore endpoints (step 8).
  - `receipt` — email the customer a thank-you/receipt via Resend.
  - `signed-download-url` — email the customer a time-limited signed URL to a private file (e.g. a paid app DMG in a private bucket).
  - `none` — rely on Stripe's own receipt; the webhook just logs.
- **Order recovery** — whether to expose a self-serve path so a customer who lost their license or whose download link expired can re-request it by entering the email they paid with (OTP-verified). Applies to `jwt` and `signed-download-url` fulfillment, and is recommended for any paid product — without it, every lost-license request becomes a support ticket. If yes, decide whether to gate it with reCAPTCHA Enterprise App Check (recommended; needs `/senternet-recaptcha-enterprise`).
- **Keys** — collect:
  - Stripe **secret key** (`sk_...`) and **webhook signing secret** (`whsec_...`) — stored in Secret Manager only, in step 5. Never written to any file in the repo.
  - Stripe **publishable key** (`pk_...`) — embedded shape only; this one is public and goes in `.env` as `VITE_STRIPE_PUBLISHABLE_KEY`.
- **`SITE_URL`** — the canonical site origin (e.g. `https://www.example.com`), used to build `success_url` / `cancel_url` / `return_url`.
- **Price IDs** (fixed-pricing only) — the `price_...` IDs from step 3, one per plan.
- **Signed-download-URL fulfillment** — the **bucket** and **object path** of the private file (e.g. bucket `comoji-releases`, object `releases/latest/Comoji.dmg`) and the link **TTL** (e.g. 24h). Confirm the object is in a bucket the project's compute service account can read.
- **JWT fulfillment** — whether an RS256 keypair already exists. If not, generate one (step 5). The **private** key becomes the `ENTITLEMENT_PRIVATE_KEY` secret; the **public** key is embedded in the client app for verification.

Tell the user you do all key entry in test mode first (`sk_test_...` / `pk_test_...`), verify end-to-end, then repeat step 5 with live keys.

### 3. Set up products and prices in the Stripe Dashboard

This is done by the user in the Stripe Dashboard (outside this skill). Walk them through it:

1. Create the product(s) and a **Price** for each plan. Record each `price_...` ID — these become the values in step 5 / step 8. (Skip for dynamic-amount sites, which build `price_data` per request.)
2. Decide `payment` vs `subscription` per price (recurring prices are `subscription`; one-time prices are `payment`).
3. For subscriptions, enable the **Customer Portal** (Settings → Billing → Customer portal) so customers can manage/cancel; note the portal link for the client app.
4. The **webhook endpoint** is registered later in step 9, once the deployed function has a URL.

premail's `functions/secrets/README.md` is a good written model of this dashboard checklist.

### 4. Enable required GCP APIs

```bash
gcloud services enable \
  secretmanager.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  eventarc.googleapis.com \
  --project "$PROJECT_ID"
```

For **signed-download-URL** fulfillment, also enable the IAM Credentials API so the function can mint V4 signed URLs from the runtime service account without a key file:

```bash
gcloud services enable iamcredentials.googleapis.com --project "$PROJECT_ID"
```

This is idempotent — already-enabled APIs are skipped automatically.

### 5. Store secrets in Firebase Secret Manager

Always:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project "$PROJECT_ID"
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project "$PROJECT_ID"
```

Firebase prompts the user to paste each value. They are stored server-side and never touch the repo. (Set the `STRIPE_WEBHOOK_SECRET` value now if known, or re-run this command after step 9 once Stripe shows you the signing secret for the new endpoint.)

For **JWT** fulfillment, generate an RS256 keypair if one doesn't exist, then store the private key as a secret:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -in private.pem -pubout -out public.pem
firebase functions:secrets:set ENTITLEMENT_PRIVATE_KEY --project "$PROJECT_ID" < private.pem
```

Embed `public.pem` in the client app for verification, and **never commit `private.pem`**. (Mirrors premail's `functions/secrets/README.md`.)

Non-secret config — price IDs and `SITE_URL` — can be passed as `defineSecret` values (premail registers `STRIPE_PRICE_MONTHLY`/`ANNUAL`/`LIFETIME` and `SITE_URL` as secrets and reads them via `process.env`) or hard-coded as constants in the function file. Prefer secrets for price IDs so prod/test values can differ without a code change. For the embedded shape, write the publishable key into the site env files:

```
# .env.development
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
# .env.production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 6. Grant the compute service account the roles it needs

Firebase Functions v2 runs under the project's default compute service account. Grant it `secretAccessor` so it can read the Stripe secrets at runtime:

```bash
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --project "$PROJECT_ID" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --project "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

For **signed-download-URL** fulfillment, the SA must also be able to sign blobs (V4 signing) as itself:

```bash
gcloud iam service-accounts add-iam-policy-binding "$COMPUTE_SA" \
  --project "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/iam.serviceAccountTokenCreator"
```

If a binding already exists, `gcloud` reports it and continues without error.

### 7. Initialize or extend the `functions/` directory

If `functions/` does not exist yet, scaffold it:

```bash
ls functions/ 2>/dev/null || (
  mkdir -p functions/src &&
  cd functions &&
  npm init -y &&
  npm install firebase-functions firebase-admin stripe &&
  npm install -D typescript @types/node
)
```

If `functions/` already exists (e.g. `/senternet-site-email-resend` ran first), just add Stripe and **append** the new exports — do not overwrite `index.ts` or existing functions:

```bash
npm --prefix functions install stripe
```

JWT fulfillment additionally needs `jsonwebtoken`:

```bash
npm --prefix functions install jsonwebtoken && npm --prefix functions install -D @types/jsonwebtoken
```

Embedded checkout needs the frontend SDK in the **site root** (not `functions/`):

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Write `functions/tsconfig.json` only if it doesn't already exist:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017"
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

Add a `"build": "tsc"` script to `functions/package.json` if not already present.

### 8. Write the functions

Compose the files from the building blocks below, using the choices from step 2. The blocks are taken directly from the two reference sites; fill in `$PLACEHOLDERS` with step-2 values.

#### a. Stripe client + admin

`functions/src/admin.ts` (only if not already present from another skill):

```typescript
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
```

`functions/src/stripe.ts` — a singleton with a pinned API version (premail's pattern):

```typescript
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  cached = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cached;
}
```

#### b. Checkout — hosted shape

`functions/src/checkout.ts` — creates a Session and returns its URL for the browser to redirect to (premail's `createCheckoutSession`):

```typescript
import { onRequest } from "firebase-functions/v2/https";
import { getStripe } from "./stripe";

const PLAN_PRICES: Record<string, string | undefined> = {
  // Map your plan keys to env-provided price IDs. For a single one-time
  // product (e.g. comoji Pro), this can be one entry.
  pro: process.env.STRIPE_PRICE_PRO,
  // monthly: process.env.STRIPE_PRICE_MONTHLY,
  // annual: process.env.STRIPE_PRICE_ANNUAL,
  // lifetime: process.env.STRIPE_PRICE_LIFETIME,
};

// Plans whose price is one-time rather than recurring.
const ONE_TIME = new Set(["pro", "lifetime"]);

export const createCheckoutSession = onRequest(
  {
    cors: ["$SITE_URL", "http://localhost:3000"],
    secrets: ["STRIPE_SECRET_KEY", "SITE_URL", "STRIPE_PRICE_PRO"],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const plan = (req.body as { plan?: string }).plan ?? "pro";
    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      res.status(400).json({ error: "Invalid or unconfigured plan" });
      return;
    }

    try {
      const stripe = getStripe();
      const siteUrl = process.env.SITE_URL ?? "$SITE_URL";
      const oneTime = ONE_TIME.has(plan);
      const session = await stripe.checkout.sessions.create({
        mode: oneTime ? "payment" : "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/thanks?session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        ...(oneTime ? { customer_creation: "always" as const } : {}),
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error("createCheckoutSession error:", err);
      res.status(500).json({ error: "Failed to create session" });
    }
  }
);
```

Frontend: a button calls the endpoint and redirects.

```typescript
async function startCheckout(plan: string): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Checkout response missing redirect URL");
  window.location.href = data.url;
}
```

#### c. Checkout — embedded shape

`functions/src/createSession.ts` — a callable that returns a `clientSecret` for the Payment Element (beeready's `createDonationSession`; shown with a dynamic amount, swap in a fixed `price` for fixed pricing):

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import Stripe from "stripe";

setGlobalOptions({ region: "us-central1" });
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

export const createPaymentSession = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const { amountCents, returnUrl } = request.data as {
      amountCents: unknown;
      returnUrl: unknown;
    };
    if (
      typeof amountCents !== "number" ||
      !Number.isInteger(amountCents) ||
      amountCents < 100 ||
      amountCents > 10_000_000
    ) {
      throw new HttpsError("invalid-argument", "Invalid amount.");
    }
    if (typeof returnUrl !== "string" || !returnUrl.startsWith("http")) {
      throw new HttpsError("invalid-argument", "Invalid return URL.");
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "elements",
      return_url: returnUrl,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "$PRODUCT_NAME" },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
    });
    return { clientSecret: session.client_secret };
  }
);
```

Frontend uses `loadStripe` + `CheckoutElementsProvider` + `PaymentElement`. See beeready's `src/components/DonationForm.tsx` for a complete, styled implementation (preset amounts, email collection, `checkout.confirm()`, success state). The essential wiring:

```tsx
import { loadStripe } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

// 1. const { data } = await httpsCallable(functions, "createPaymentSession")({ amountCents, returnUrl });
// 2. <CheckoutElementsProvider stripe={stripePromise} options={{ clientSecret: data.clientSecret }}>
//      <YourForm />  // renders <PaymentElement/>, calls useCheckoutElements().checkout.confirm()
//    </CheckoutElementsProvider>
```

#### d. Webhook (shared skeleton, fulfillment branch below)

`functions/src/webhook.ts` — verifies the signature against the **raw** body and handles `checkout.session.completed`:

```typescript
import { onRequest } from "firebase-functions/v2/https";
import { getStripe } from "./stripe";
// import branch-specific helpers here (jwt, email, storage) per fulfillment choice

export const stripeWebhook = onRequest(
  // Add ENTITLEMENT_PRIVATE_KEY (jwt) and/or RESEND_API_KEY (email) as needed:
  { secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
  async (req, res) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers["stripe-signature"];
    if (!webhookSecret || !sig) {
      res.status(400).send("Missing webhook secret or signature");
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        // === FULFILLMENT BRANCH (see below) — keyed by event.id for idempotency ===
      }
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).send("Handler error");
    }
  }
);
```

**Fulfillment branch — `jwt`:** sign an RS256 token and stash it in Firestore so the success page can fetch it. Add a `functions/src/jwt.ts` with `signProToken` / `signLifetimeToken` (premail's, using `process.env.ENTITLEMENT_PRIVATE_KEY` and `jsonwebtoken` RS256):

```typescript
const customerId = session.customer as string;
if (!customerId) { res.json({ received: true }); return; }
const token =
  session.mode === "payment"
    ? signLifetimeToken(customerId, (session.payment_intent as string) || session.id)
    : signProToken(customerId, session.subscription as string);
await db.collection("activations").doc(session.id).set({
  token,
  createdAt: FieldValue.serverTimestamp(),
});
```

**Fulfillment branch — `receipt`:** email the customer via Resend (reuse `sendResendEmail` from `/senternet-site-email-resend`):

```typescript
const email = session.customer_details?.email;
if (email) {
  await sendResendEmail(
    { to: [email], template: { id: "$RECEIPT_TEMPLATE_ALIAS", variables: { /* … */ } } },
    `receipt/${event.id}`,
  );
}
```

**Fulfillment branch — `signed-download-url`:** generate a V4 signed URL to the private file and email it:

```typescript
import { getStorage } from "firebase-admin/storage";

const email = session.customer_details?.email;
if (email) {
  const TTL_MS = $TTL_MS; // e.g. 24 * 60 * 60 * 1000
  const [url] = await getStorage()
    .bucket("$RELEASES_BUCKET")
    .file("$OBJECT_PATH") // e.g. releases/latest/Comoji.dmg
    .getSignedUrl({ version: "v4", action: "read", expires: Date.now() + TTL_MS });

  await sendResendEmail(
    {
      to: [email],
      template: {
        id: "$DOWNLOAD_TEMPLATE_ALIAS",
        variables: { DOWNLOAD_URL: url, EXPIRES_HOURS: String(TTL_MS / 3_600_000) },
      },
    },
    `download/${event.id}`,
  );
}
```

#### e. JWT-only extra endpoints (optional, premail)

For licensed desktop apps, also port these from premail so the app can fetch, refresh, and restore entitlement:

- `getActivationToken` (`activation.ts`) — success page GETs `/api/activation?session=…`, returns the stored token (404 if missing, 410 after a 1-hour TTL).
- `refreshToken` (`refresh.ts`) — app POSTs its token; for subscriptions, re-checks `stripe.subscriptions.retrieve(...).status` and re-signs pro/free; lifetime re-signs unconditionally; on Stripe outage returns the token unchanged.

For self-serve license recovery, add the `recoverPurchase` endpoint from subsection f.

#### f. Order recovery (OTP, `jwt` + `signed-download-url`)

Stripe is the source of truth for who paid, so a customer who lost their license or whose download link expired can recover it by proving they own the email they paid with. premail's `restore.ts` + `findEntitlement.ts` + `email.ts` implement this as a two-phase, OTP-verified flow; port and generalize them.

`functions/src/findEntitlement.ts` — look a customer up by email and classify what they bought (port premail's `findCustomerEntitlement` verbatim): list `customers` by email, then per customer check `subscriptions.list({ status: "active" | "trialing" })` → pro, a succeeded `paymentIntents` entry → one-time, and a completed payment-mode `checkout.sessions` entry → covers `$0`/100%-off purchases that have no PaymentIntent. Returns `{ customerId, subscriptionId, plan }` or `null`.

`functions/src/recover.ts` — one `onRequest` endpoint with two phases keyed on whether the request carries a `code`:

```typescript
import * as crypto from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { db } from "./admin";
import { getStripe } from "./stripe";
import { findCustomerEntitlement } from "./findEntitlement";
import { sendOtpEmail } from "./email";        // Resend template with a CODE variable
// jwt fulfillment: import { signProToken, signLifetimeToken } from "./jwt";
// signed-url fulfillment: import { getStorage } from "firebase-admin/storage";

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const docId = (email: string) => crypto.createHash("sha256").update(email).digest("hex");
const delay = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

export const recoverPurchase = onRequest(
  {
    cors: ["$SITE_URL", "http://localhost:3000"],
    // add ENTITLEMENT_PRIVATE_KEY for jwt fulfillment:
    secrets: ["STRIPE_SECRET_KEY", "RESEND_API_KEY"],
  },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const start = Date.now();
    const settle = () => delay(500 - (Date.now() - start)); // constant-time response

    // Optional App Check (reCAPTCHA Enterprise). Skip in the emulator.
    if (!process.env.FUNCTIONS_EMULATOR) {
      const tok = req.header("X-Firebase-AppCheck");
      if (!tok) { await settle(); res.status(401).json({ error: "missing_app_check" }); return; }
      try { await admin.appCheck().verifyToken(tok); }
      catch { await settle(); res.status(401).json({ error: "invalid_app_check" }); return; }
    }

    const body = req.body as { email?: string; code?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) { await settle(); res.json({ sent: false }); return; }
    const ref = db.collection("recoverOtp").doc(docId(email));

    // Phase 2 — verify the code and reissue the entitlement.
    if (typeof body.code === "string" && body.code.trim()) {
      const snap = await ref.get();
      const rec = snap.data() as
        | { code: string; expiresAt: Timestamp; attempts: number; customerId: string; subscriptionId: string; plan: "pro" | "lifetime" }
        | undefined;
      if (!rec) { await settle(); res.json({ error: "invalid_code" }); return; }
      if (rec.expiresAt.toMillis() < Date.now()) { await ref.delete(); await settle(); res.json({ error: "expired" }); return; }
      if (rec.attempts >= MAX_ATTEMPTS) { await settle(); res.json({ error: "too_many_attempts" }); return; }
      if (rec.code !== body.code.trim()) {
        await ref.update({ attempts: rec.attempts + 1 });
        await settle();
        res.json({ error: "invalid_code", attemptsLeft: MAX_ATTEMPTS - (rec.attempts + 1) });
        return;
      }
      await ref.delete();

      // === reissue, branched by fulfillment ===
      // jwt:
      //   const token = rec.plan === "lifetime"
      //     ? signLifetimeToken(rec.customerId, rec.subscriptionId)
      //     : signProToken(rec.customerId, rec.subscriptionId);
      //   await settle(); res.json({ token }); return;
      // signed-download-url:
      //   const [url] = await getStorage().bucket("$RELEASES_BUCKET").file("$OBJECT_PATH")
      //     .getSignedUrl({ version: "v4", action: "read", expires: Date.now() + $TTL_MS });
      //   await settle(); res.json({ downloadUrl: url }); return;
      return;
    }

    // Phase 1 — look up Stripe and, if a match, email an OTP. Always answer the
    // same way so the endpoint never reveals whether an email is a customer.
    try {
      const entitlement = await findCustomerEntitlement(getStripe(), email);
      if (entitlement) {
        const code = String(crypto.randomInt(100000, 1000000));
        await ref.set({
          email, code, attempts: 0,
          expiresAt: Timestamp.fromMillis(Date.now() + OTP_TTL_MS),
          customerId: entitlement.customerId,
          subscriptionId: entitlement.subscriptionId,
          plan: entitlement.plan,
        });
        await sendOtpEmail(email, code);
      }
    } catch (err) {
      console.error("recoverPurchase error:", err);
    }
    await settle();
    res.json({ sent: true });
  }
);
```

`sendOtpEmail(to, code)` lives in the shared `email.ts` and sends a Resend template whose only variable is `CODE` (premail's `email.ts`). The frontend is a two-step form: submit email → "check your inbox" → submit the 6-digit code → on `{ token }` activate the app, or on `{ downloadUrl }` start the download.

Security properties to preserve from premail: hashed email as the Firestore doc id, a 15-minute TTL, a 5-attempt cap, a constant ~500 ms response (`settle()`) to blunt timing attacks, and the never-enumerate rule (phase 1 always returns `{ sent: true }`).

#### g. Exports

Add only the functions you wrote to `functions/src/index.ts` (append, don't replace):

```typescript
export { stripeWebhook } from "./webhook";
export { createCheckoutSession } from "./checkout"; // hosted
// export { createPaymentSession } from "./createSession"; // embedded
// export { getPrices } from "./prices";                   // jwt/hosted pricing display
// export { getActivationToken } from "./activation";       // jwt
// export { refreshToken } from "./refresh";                // jwt
// export { recoverPurchase } from "./recover";             // order recovery (jwt + signed-url)
```

### 9. Wire up hosting and register the webhook

Add a `"functions"` block to `firebase.json` if it isn't there (don't disturb existing hosting config):

```json
{
  "hosting": { ... },
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" ci",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  }
}
```

For the **hosted** shape, add `/api/*` rewrites so the browser hits clean same-origin paths (premail's pattern). Put these **before** the SPA catch-all (`"source": "**"`):

```json
"rewrites": [
  { "source": "/api/checkout", "function": "createCheckoutSession", "region": "us-central1" },
  { "source": "**", "destination": "/index.html" }
]
```

Add the matching rewrites for any other `onRequest` endpoints you exported — JWT extras (`/api/prices`, `/api/activation`, `/api/refresh`) and order recovery (`/api/recover` → `recoverPurchase`, used by both `jwt` and `signed-download-url` fulfillment). The **embedded** shape's callable needs no rewrite (it's invoked through the Firebase SDK). The **webhook** is an `onRequest` function — it does **not** need a rewrite; Stripe calls its deployed function URL directly.

After the first deploy (step 12), copy the function's URL and in the Stripe Dashboard create a webhook endpoint pointing at it, subscribed to **`checkout.session.completed`**. Then put the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET` (re-run the step-5 command if you used a placeholder).

### 10. Update the deploy script and `.gitignore`

In the root `package.json`, change `--only hosting` to `--only hosting,functions` in `deploy:prod` (only if `functions` isn't already in the `--only` flag).

Add to the root `.gitignore` if missing:

```
functions/lib/
functions/node_modules/
functions/.secret.local
private.pem
```

`functions/.secret.local` holds the **test-mode** secrets the emulator reads in step 11 — it must never be committed.

### 11. Test locally with the Firebase emulators against the Stripe sandbox

Run the whole flow — checkout → webhook → fulfillment → recovery — locally in Stripe **test mode** before deploying.

**a. Emulator config in `firebase.json`** (premail's ports):

```json
"emulators": {
  "functions": { "port": 5001 },
  "firestore": { "port": 8080 },
  "ui": { "enabled": true }
}
```

**b. Give the emulator its secrets.** The Secret Manager values from step 5 are **not** available to the emulator.

> ⚠️ **The file MUST be `functions/.secret.local` — NOT `functions/.env`.** The Functions emulator loads `defineSecret`/secret values only from `functions/.secret.local`. A `functions/.env` file is for non-secret runtime config (`process.env`) and will **not** populate the secrets the functions declare, so `STRIPE_SECRET_KEY` etc. come back empty and every call fails with "secret not set." This is the single most common local-setup mistake — use `.secret.local`.

Create `functions/.secret.local` (gitignored — step 10) with **test-mode** values:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # the one `stripe listen` prints in step d
RESEND_API_KEY=re_...                  # receipt / recovery fulfillment
STRIPE_PRICE_PRO=price_...             # test-mode price IDs + SITE_URL, if read via env
SITE_URL=http://localhost:3000
ENTITLEMENT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"   # jwt only
```

The emulator loads this file automatically. App Check is skipped under the emulator — the `recoverPurchase` code already guards on `process.env.FUNCTIONS_EMULATOR`.

**c. Point the frontend at the emulator in dev.**

- Embedded (callable): in the firebase init, `if (import.meta.env.DEV) connectFunctionsEmulator(functions, 'localhost', 5001)` (premail's `src/lib/firebase.ts`).
- Hosted (HTTP `/api/*`): proxy each endpoint to the emulator in `vite.config.ts` so the same paths work locally (premail's pattern):

```ts
server: {
  proxy: {
    '/api/checkout': { target: 'http://127.0.0.1:5001/$PROJECT_ID/us-central1', rewrite: (p) => p.replace('/api/checkout', '/createCheckoutSession') },
    '/api/recover':  { target: 'http://127.0.0.1:5001/$PROJECT_ID/us-central1', rewrite: (p) => p.replace('/api/recover', '/recoverPurchase') },
    // …one entry per /api endpoint you exported
  },
}
```

**d. Forward Stripe sandbox webhooks to the local emulator** (after `stripe login`):

```bash
stripe listen --forward-to localhost:5001/$PROJECT_ID/us-central1/stripeWebhook
```

It prints a `whsec_...` — copy it into `functions/.secret.local` as `STRIPE_WEBHOOK_SECRET` and restart the emulator.

**e. Run it** in separate terminals:

```bash
npm --prefix functions run build && firebase emulators:start --only functions,firestore
stripe listen --forward-to localhost:5001/$PROJECT_ID/us-central1/stripeWebhook
npm run dev
```

Then either complete a test-mode checkout from the dev site (card `4242 4242 4242 4242`) or fire the event straight at the webhook:

```bash
stripe trigger checkout.session.completed
```

Watch the emulator logs and the Firestore emulator UI to confirm fulfillment (token written / email sent / signed URL generated) and recovery. Resend calls are real even in test mode — they actually send, so use an address you control.

### 12. Deploy and verify

```bash
firebase deploy --only functions --project "$PROJECT_ID"
```

Then run an end-to-end **test-mode** purchase:

1. Start a checkout from the site and complete it with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
2. Confirm `checkout.session.completed` fired (Stripe Dashboard → Developers → Webhooks → your endpoint shows a 200) and that fulfillment happened:
   - `jwt` — the success page receives a token; a doc exists at `activations/{sessionId}`.
   - `receipt` / `signed-download-url` — the customer email arrives; the signed URL downloads the file, and returns 403 after the TTL.
3. If you added order recovery, exercise it end-to-end: POST the buyer's email to `/api/recover` → OTP email arrives → POST email + code → you get back a fresh `{ token }` or `{ downloadUrl }`. Confirm a wrong code decrements `attemptsLeft`, an unknown email still returns `{ sent: true }` (no enumeration), and the code stops working after 15 minutes.
4. Check logs for errors:

```bash
gcloud functions logs read --project "$PROJECT_ID" --limit 20
```

A `403` from Secret Manager → recheck step 6. A signature-verification failure → the `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint, or the body was parsed before verification (use `req.rawBody`).

Once verified in test mode, repeat step 5 with live keys (`sk_live_...`, `pk_live_...`, the live endpoint's `whsec_...`) and redeploy.

## Notes

- The secret key, webhook signing secret, and JWT private key live **only** in Secret Manager — never in the repo, `.env`, or logs. The only Stripe value that belongs in `.env` is the **publishable** key (`VITE_STRIPE_PUBLISHABLE_KEY`), and only for the embedded shape.
- **Local emulator secrets go in `functions/.secret.local`, never `functions/.env`.** The emulator reads declared secrets (`defineSecret`) only from `.secret.local`; a `.env` file populates plain `process.env` config, not secrets, so the Stripe keys would silently be empty. If a local call fails with "STRIPE_SECRET_KEY not set" / a Stripe auth error, check that the values are in `.secret.local` (and that you restarted the emulator after editing it) — this is the most common mistake.
- **Always verify the webhook against `req.rawBody`.** Any middleware that re-serializes the JSON body breaks the signature check.
- **Idempotency:** Stripe retries webhooks. Key side effects off `event.id` (e.g. `` `download/${event.id}` `` as the Resend idempotency key) and make fulfillment safe to run twice.
- **Pin the Stripe API version** in `getStripe()` (premail uses `2025-02-24.acacia`) so a future SDK bump can't silently change request/response shapes.
- **Signed-download-URL + free tier can coexist.** Keep the paid file in a private bucket for signed URLs while a separate public download (e.g. comoji's `fetch-latest-release.mjs` manifest flow) serves a free build. If the site currently advertises itself as free, flag that the marketing copy and download CTAs need updating to introduce the paid tier — that's a separate change from this skill.
- **Subscriptions:** enable the Customer Portal in the Stripe Dashboard and surface its link in the client app so users can manage or cancel. The `refreshToken` endpoint is what keeps a desktop app's entitlement in sync with subscription status.
- **Order recovery** treats Stripe as the source of truth: it reissues whatever the customer already paid for, so it works equally for a lost JWT license or an expired signed download URL — only the phase-2 reissue line changes. Keep premail's abuse protections (hashed-email doc id, 15-min TTL, 5-attempt cap, constant-time response, never-enumerate). The `recoverOtp` collection and (for `jwt`) the `activations` collection both need Firestore — Firebase prompts to enable it on first deploy if it isn't already on.
- **Re-run safe:** if `functions/` already exists (e.g. Resend ran first), append the Stripe exports and secrets rather than overwriting `index.ts`. Only scaffold `functions/` in step 7 when it's absent.
