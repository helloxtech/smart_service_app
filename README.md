# Smart Service (PM Mobile App)

Smart Service is a cross-platform iOS/Android mobile app for Property Managers.

V1 scope implemented:
- Live inbox with bot-to-PM handoff flow
- Conversation detail with chat thread and PM reply composer
- Property/unit context (read-only) in chat
- Maintenance request summary and status updates (`New`, `In Progress`, `Done`)
- Site visit note capture with optional photo attachment
- Deep links to full Dataverse records when more detail is needed

## Tech Stack

- Expo + React Native (TypeScript)
- React Navigation (Stack + Bottom Tabs)
- Local store for V1 demo (`src/store/AppStore.tsx`)
- API/realtime integration seams prepared for BFF + Cloudflare

## App Structure

- `src/navigation/`
  - `RootNavigator.tsx` (auth gating)
  - `MainTabNavigator.tsx` (Inbox, Maintenance, Site Visits)
  - `InboxStackNavigator.tsx` (Inbox list -> Conversation detail)
- `src/screens/`
  - `SignInScreen.tsx`
  - `InboxScreen.tsx`
  - `ConversationDetailScreen.tsx`
  - `MaintenanceScreen.tsx`
  - `VisitsScreen.tsx`
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

Optional type check:

```bash
npm run typecheck
```

## Environment Variables

Create `.env` (or set in EAS/local shell):

```bash
EXPO_PUBLIC_BFF_BASE_URL=https://your-bff.example.com
EXPO_PUBLIC_CHAT_WS_URL=wss://your-chat-worker.example.com
```

## Integration Notes (Production)

1. **Authentication**
- Replace demo login with Entra ID (MSAL) and BFF token exchange.
- Keep PM role/permissions from BFF claims.

2. **Live Chat**
- Use Cloudflare Worker + Durable Objects websocket endpoint.
- Enable websocket hibernation in DO implementation to control duration cost.

3. **Dataverse Boundary**
- Keep full chat transcripts in Cloudflare (D1).
- Write summary/link + case/work-order references into Dataverse.

4. **Photos**
- Upload image to R2 via signed URL from BFF/Worker.
- Store only metadata + record linkage in Dataverse.

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
