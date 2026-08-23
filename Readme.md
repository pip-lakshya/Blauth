# BLAuth

> Your identity. Your credentials. Your control.

BLAuth is a privacy-first identity provider demo. It combines browser-local biometric matching, a Polygon Amoy credential commitment, explicit consent, and selective disclosure.

It is designed around a familiar provider handoff:

```text
Developer application
  → Continue with BLAuth
  → BLAuth user authentication surface
  → local biometric verification + Polygon Amoy proof
  → user consent
  → only approved fields returned to the developer
```

## What is implemented

- Identity wallet registration with strict validation.
- Browser-local face descriptor enrollment and matching.
- Deterministic SHA-256 biometric commitments (`bytes32`).
- Polygon Amoy (`80002`) `CredentialRegistry` integration.
- Existing-credential idempotency: an active commitment is checked before a registration transaction is sent.
- Developer applications with an API key and one-time API secret.
- Authenticated developer verification requests.
- A distinct `/authenticate` BLAuth user surface.
- Consent and selective disclosure.
- Derived `ageOver18` disclosure without returning DOB.
- Local JSON persistence for hackathon data and disclosure history.

## Privacy boundaries

The browser performs face detection, descriptor generation, and descriptor matching. The enrolled descriptor is stored in browser IndexedDB for this demo, not localStorage.

The backend and Polygon Amoy registry never receive face images, camera frames, embeddings, descriptors, or biometric templates. They receive only the derived 32-byte commitment.

The contract stores only:

- credential hash
- registering wallet address
- registration timestamp
- revocation state

Developers receive only requested fields that the user approves. They never receive biometric material, the biometric commitment, developer secrets from another app, or unrequested credentials.

## Authentication flow

### Enrollment

```text
Register identity details
  → capture local face descriptor
  → local face verification
  → generate deterministic biometric commitment
  → POST /identity/register
  → check commitment on Polygon Amoy
  → register only if it does not already exist
  → persist local wallet mapping
```

If the commitment is already registered and active, BLAuth reuses its wallet mapping and does not send another blockchain transaction. A revoked commitment is rejected.

### Developer and user handoff

```text
POST /developer/apps
  → appId + apiKey + one-time apiSecret

POST /developer/verify
  → requestId

/authenticate?requestId=...
  → local biometric match
  → POST /identity/authenticate
  → on-chain registered and not revoked check
  → POST /verify/consent
  → { verified, data }
```

The Developer Console is the verifier surface. `/authenticate` is the user surface and deliberately does not receive developer API credentials.

## Supported disclosures

| Field | Notes |
| --- | --- |
| `name` | Direct credential field |
| `studentId` | Direct credential field |
| `email` | Direct credential field |
| `phone` | Direct credential field |
| `dob` | Direct credential field; disclose only when explicitly requested and approved |
| `ageOver18` | Derived from DOB; does not return DOB or exact age |

## API summary

### `POST /identity/register`

```json
{
  "verified": true,
  "credentials": {
    "name": "Demo User",
    "studentId": "BLAUTH-DEMO-001",
    "email": "demo@example.com",
    "phone": "9876543210",
    "dob": "2000-01-15"
  },
  "biometricCommitment": "0x..."
}
```

Response contains a wallet ID, active status, and blockchain proof metadata when blockchain is enabled. Credentials are not included.

### `POST /developer/apps`

Creates a developer application and returns:

```json
{
  "appId": "app_...",
  "name": "College Portal",
  "apiKey": "blauth_pk_...",
  "apiSecret": "blauth_sk_..."
}
```

The API secret is returned only at creation; the backend stores only its hash.

### `POST /developer/verify`

Headers:

```text
X-BLAuth-API-Key: blauth_pk_...
X-BLAuth-API-Secret: blauth_sk_...
```

Body:

```json
{
  "walletId": "wallet_...",
  "requestedFields": ["name", "studentId"]
}
```

Response:

```json
{ "requestId": "req_..." }
```

### `POST /identity/authenticate`

Accepts only:

```json
{ "biometricCommitment": "0x..." }
```

It checks Polygon Amoy registration and revocation status. It does not accept raw biometric material.

### `POST /verify/consent`

```json
{
  "requestId": "req_...",
  "approvedFields": ["name", "studentId"]
}
```

Example selective-disclosure response:

```json
{
  "verified": true,
  "data": {
    "name": "Demo User",
    "studentId": "BLAUTH-DEMO-001"
  }
}
```

## Project structure

```text
backend/
  contracts/CredentialRegistry.sol
  scripts/deploy-credential-registry.js
  src/
    controllers/ routes/ services/ models/ middleware/ utils/
  data/
  test/

blauth-frontend/
  src/
    components/TopNavbar.jsx
    pages/
    services/api.js
    services/biometricIdentity.js
    services/faceRecognition.js
```

## Configuration and deployment

Copy the example files; never commit real credentials.

```text
backend/.env.example
blauth-frontend/.env.example
```

Backend variables:

```env
PORT=3000
CORS_ORIGIN=https://app.example.com
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=<POLYGON_AMOY_RPC_URL>
BLOCKCHAIN_PRIVATE_KEY=<BACKEND_SIGNER_PRIVATE_KEY>
BLOCKCHAIN_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
```

Frontend variables:

```env
# Leave blank when frontend and backend are served through the same origin.
VITE_API_BASE_URL=
```

For production, place the frontend and API behind the same public origin/reverse proxy. The frontend then uses relative API paths such as `/identity/register`, rather than a hardcoded development hostname. If the API is deployed separately, set `VITE_API_BASE_URL` to its HTTPS origin and configure `CORS_ORIGIN` accordingly.

### Render + Vercel deployment

This repository includes `render.yaml` for the API and `vercel.json` for React Router SPA fallback. Configure the Render web service from the current branch (or use the blueprint), with `backend` as its root directory. Its health endpoint is `/health` and its start command is `npm start`.

Set these Render environment variables in the Render dashboard:

```env
CORS_ORIGIN=https://<your-vercel-project>.vercel.app
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=<POLYGON_AMOY_RPC_URL>
BLOCKCHAIN_PRIVATE_KEY=<BACKEND_SIGNER_PRIVATE_KEY>
BLOCKCHAIN_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
```

Set this Vercel environment variable and redeploy the frontend:

```env
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
```

After every backend route change, deploy the current backend revision to Render. A successful `/health` response alone does not prove that `/identity/register` or the other API routes are deployed.

## Run and verify

```bash
cd backend
npm install
npm test
npm start
```

In a second terminal:

```bash
cd blauth-frontend
npm install
npm run lint
npm run build
npm run dev
```

For a new demo user, use **Wallet → Reset local demo identity**. It clears this browser's local wallet ID, identity form data, and IndexedDB descriptor; it does not delete on-chain or backend records.

## Blockchain

- Network: Polygon Amoy
- Chain ID: `80002`
- Contract: `CredentialRegistry.sol`
- Supported methods: `registerCredential`, `getCredential`, `isCredentialRegistered`, and `revokeCredential`

The deploy script is available for a new environment only:

```bash
cd backend
npm run compile:contract
npm run deploy:amoy
```

Do not redeploy an existing configured registry merely to run the application.
