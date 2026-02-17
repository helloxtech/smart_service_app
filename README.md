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

For iOS Simulator on the same Mac, prefer localhost mode:

```bash
npm run ios:localhost
```

For a physical phone, use one of:

```bash
npm run start:lan
# or, if LAN is blocked:
npm run start:tunnel
```

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
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_BFF_BASE_URL=http://127.0.0.1:7071/api
EXPO_PUBLIC_CHAT_WS_URL=
EXPO_PUBLIC_INTERNAL_EMAIL_DOMAINS=rentalsmart.ca
```

- `EXPO_PUBLIC_USE_MOCK=false` connects Smart Service to your BFF (real Dataverse-backed PM data).
- Use `EXPO_PUBLIC_BFF_BASE_URL=http://127.0.0.1:7071/api` for iOS Simulator on the same Mac.
- For physical devices, replace `127.0.0.1` with your Mac LAN IP (for example `http://192.168.1.243:7071/api`).
- Set `EXPO_PUBLIC_USE_MOCK=true` only when you intentionally want local demo mode.

## Integration Notes (Production)

1. **Authentication**
- Replace demo login with Entra ID (MSAL) and BFF token exchange.
- Keep PM role/permissions from BFF claims.

2. **Live Chat**
- Use Cloudflare Worker + Durable Objects websocket endpoint.
- Enable websocket hibernation in DO implementation to control duration cost.
- The app requests chat socket access from `POST /mobile/pm/conversations/:id/chat-access` and then opens websocket.

3. **Dataverse Boundary**
- Keep full chat transcripts in Cloudflare (D1).
- Write summary/link + case/work-order references into Dataverse.

4. **Photos**
- Upload image to R2 via signed URL from BFF/Worker.
- Store only metadata + record linkage in Dataverse.

## Remote API Contract Used by App

When `EXPO_PUBLIC_USE_MOCK=false`, the app calls these BFF endpoints:

- `POST /mobile/pm/auth/sign-in`
- `GET /mobile/pm/bootstrap`
- `POST /mobile/pm/conversations/:id/assign`
- `POST /mobile/pm/conversations/:id/messages`
- `POST /mobile/pm/conversations/:id/close`
- `PATCH /mobile/pm/maintenance/:id`
- `POST /mobile/pm/visit-notes`
- `POST /mobile/pm/conversations/:id/chat-access`

## UX Decisions for PM Workflow

- Conversation page prioritizes context above chat to reduce back-and-forth.
- Status updates are one-tap segmented actions for field speed.
- Site notes are available both in-chat and dedicated Site Visits tab.
- Deep links are exposed at point of action to avoid searching in back-office tools.

## Next Recommended Enhancements

- Push notifications (APNs/FCM)
- Queue assignment rules (`new`, `assigned`, `waiting`, `closed`)
- Offline cache + retry for poor building connectivity
- Bot confidence threshold + auto-handoff trigger configuration
