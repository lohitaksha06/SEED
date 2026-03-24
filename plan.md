## Farmer Marketplace MVP Milestones

### Milestone 1: App Foundation (in progress)
- [x] Install routing dependency.
- [x] Add app routes for Buy, Sell, Chat, and Sign in.
- [x] Create protected route behavior for Sell and Chat.
- [x] Add Supabase client module.
- [x] Add Auth provider with sign-in/sign-up/sign-out.
- [x] Add shell layout and scaffold pages.
- [x] Run lint and build verification.

### Milestone 2: Supabase Schema + RLS
- [x] Create SQL for profiles, categories, listings, listing_images, conversations, conversation_participants, messages.
- [x] Add indexes and constraints for status, ownership, and one-to-one listing chat.
- [x] Enable RLS and add public-read/owner-write/participant policies.
- [x] Seed categories.
- [x] Ask user to run SQL in Supabase and confirm.

### Milestone 3: Buy Flow
- [x] Listing feed (published only).
- [x] Category filter and keyword search.
- [x] Listing detail panel and chat CTA.

### Milestone 4: Sell Flow
- [x] Seller listing dashboard.
- [x] Create/edit listing form.
- [x] Status actions: draft, published, sold, archived.

### Milestone 5: Chat Flow
- [x] Create/get listing-scoped conversation.
- [x] Conversation list and message thread.
- [x] Realtime messages.

### Milestone 6: QA
- [x] RLS verification checklist prepared for anonymous, buyer, and seller roles.
- [x] Core journey test checklist prepared for browse, publish, chat, and sold updates.
