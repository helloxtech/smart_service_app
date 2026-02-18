# Smart Service (Role-Based Mobile App)

Smart Service is a cross-platform iOS/Android mobile app with role-based layouts.

V1 scope implemented:
- Live inbox with bot-to-PM handoff flow
- Conversation detail with chat thread and PM reply composer
- Property/unit context (read-only) in chat
- Maintenance request summary and status updates (`New`, `In Progress`, `Done`)
- Site visit note capture with optional photo attachment
- Deep links to full Dataverse records when more detail is needed
- Role-based sign-in and tab layout (`PM`, `Supervisor`, `Tenant`, `Landlord`)

## Tech Stack

- Expo + React Native (TypeScript)
- React Navigation (Stack + Bottom Tabs)
- Local store for V1 demo (`src/store/AppStore.tsx`)
- API/realtime integration seams prepared for BFF + Cloudflare

## App Structure

- `src/navigation/`
  - `RootNavigator.tsx` (auth gating)
  - `MainTabNavigator.tsx` (role-based tabs)
  - `InboxStackNavigator.tsx` (Inbox list -> Conversation detail)
- `src/screens/`
  - `SignInScreen.tsx`
  - `InboxScreen.tsx`
  - `ConversationDetailScreen.tsx`
  - `MaintenanceScreen.tsx`
  - `VisitsScreen.tsx`
  - `RoleDashboardScreen.tsx`
  - `RoleProfileScreen.tsx`
- `src/components/`
  - Reusable cards and status/UI primitives
- `src/store/AppStore.tsx`
  - Demo state + actions
- `src/services/`
  - `api.ts` for BFF calls
  - `chatRealtime.ts` for Cloudflare DO websocket integration pattern

## Run Locally

```bash
npm install
npm run ios
# or
npm run android
```

`npm run ios` now builds/runs **Release** configuration (no Metro required).
Use `npm run ios:debug` only when you intentionally want Debug + Metro.

For iOS Simulator on the same Mac, prefer localhost mode:

```bash
npm run ios:localhost
```

Start the BFF in a separate terminal before attempting login:

```bash
cd ../rental-smart-bff
npm install
npm run dev
```

For a physical phone, use one of:

```bash
npm run start:lan
# or, if LAN is blocked:
npm run start:tunnel
```

For production-like iPhone testing (same behavior target as App Store builds), use Xcode `Release` build on device or EAS/TestFlight, and point to the public BFF URL.

If Expo Go hangs on `Opening project...`, stop stale Metro processes first, then restart with the correct host mode:

```bash
pkill -f "expo start" || true
npm run ios:localhost
# or npm run start:tunnel for physical device
```

Optional type check:

```bash
npm run typecheck
```

## Environment Variables

Create `.env` (or set in EAS/local shell):

```bash
EXPO_PUBLIC_BFF_BASE_URL=http://127.0.0.1:7071/api
EXPO_PUBLIC_CHAT_WS_URL=
EXPO_PUBLIC_INTERNAL_EMAIL_DOMAINS=rentalsmart.ca
EXPO_PUBLIC_ENTRA_TENANT_ID=00000000-0000-0000-0000-000000000000
EXPO_PUBLIC_ENTRA_CLIENT_ID=00000000-0000-0000-0000-000000000000
EXPO_PUBLIC_ENTRA_REDIRECT_SCHEME=ca.rentalsmart.smartservice
```

- Smart Service now always runs in real-data mode through your BFF (no mock fallback).
- Use `EXPO_PUBLIC_BFF_BASE_URL=http://127.0.0.1:7071/api` for iOS Simulator on the same Mac.
- For physical devices, replace `127.0.0.1` with your Mac LAN IP (for example `http://192.168.1.243:7071/api`).
- If BFF URL is still localhost, Smart Service now auto-resolves to your Metro host IP in debug device runs.
- Release builds automatically fall back to `https://rental-smart-bff-bga2cjeqazb7e8f9.canadacentral-01.azurewebsites.net/api` when localhost is not valid.
- `EXPO_PUBLIC_ENTRA_TENANT_ID` and `EXPO_PUBLIC_ENTRA_CLIENT_ID` must match the Entra app registration used for mobile Microsoft login.
- Redirect URI in Entra app registration should use the same custom scheme (for example `ca.rentalsmart.smartservice://auth`).

## EAS Builds

`eas.json` is included with:
- `preview` profile (internal distribution)
- `production` profile (store release)

Quick start:

```bash
npm i -g eas-cli
eas login
eas build --platform ios --profile preview
```

## Integration Notes (Production)

1. **Authentication**
- Microsoft button uses Entra OAuth Authorization Code + PKCE on-device.
- App sends Microsoft `id_token` to BFF (`/mobile/pm/auth/microsoft`) for server-side signature/issuer/audience verification.
- BFF issues PM mobile session JWT after domain/tenant/client checks.

2. **Live Chat**
- Use Cloudflare Worker + Durable Objects websocket endpoint.
- Enable websocket hibernation in DO implementation to control duration cost.
- The app requests chat socket access from `POST /mobile/pm/conversations/:id/chat-access` and then opens websocket.
- If websocket URL is not configured, the app now falls back to periodic message polling so PM can still receive visitor updates.

3. **Dataverse Boundary**
- Keep full chat transcripts in Cloudflare (D1).
- Write summary/link + case/work-order references into Dataverse.

4. **Photos**
- Upload image to R2 via signed URL from BFF/Worker.
- Store only metadata + record linkage in Dataverse.

## Remote API Contract Used by App

The app calls these BFF endpoints:

- `POST /mobile/pm/auth/sign-in`
- `POST /mobile/pm/auth/microsoft` (expects Microsoft `id_token` from OAuth PKCE flow)
- `GET /mobile/pm/bootstrap`
- `POST /mobile/pm/conversations/:id/assign`
- `POST /mobile/pm/conversations/:id/messages`
- `POST /mobile/pm/conversations/:id/close`
- `PATCH /mobile/pm/maintenance/:id`
- `POST /mobile/pm/visit-notes`
- `POST /mobile/pm/conversations/:id/chat-access`
- `POST /mobile/pm/push/register`

## UX Decisions for PM Workflow

- Conversation page prioritizes context above chat to reduce back-and-forth.
- Status updates are one-tap segmented actions for field speed.
- Site notes are available both in-chat and dedicated Site Visits tab.
- Deep links are exposed at point of action to avoid searching in back-office tools.

## Next Recommended Enhancements

- Persist PM push tokens in Dataverse (or another durable store) instead of in-memory BFF state
- Queue assignment rules (`new`, `assigned`, `waiting`, `closed`)
- Offline cache + retry for poor building connectivity
- Bot confidence threshold + auto-handoff trigger configuration
