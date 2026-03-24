# Farmer Marketplace MVP QA Checklist

This checklist covers Milestone 6 verification for Buy, Sell, and Chat.

## 1) Setup

1. Open two browser sessions (normal + incognito).
2. Create two accounts in app:
- seller account
- buyer account
3. Keep both sessions logged in simultaneously.

## 2) RLS Verification

1. Anonymous access:
- Open Buy page while signed out.
- Confirm published listings are visible.
- Confirm Sell and Chat routes redirect to Sign in.

2. Seller data isolation:
- Sign in as seller.
- Create two listings (one draft, one published).
- Confirm seller can edit and change status for own listings.
- Confirm buyer account cannot update seller listings.

3. Conversation and message isolation:
- Sign in as buyer and start chat from one published listing.
- Confirm buyer can only see conversations where buyer or seller equals current user.
- Confirm third account (optional) cannot read conversations/messages from others.

## 3) Core Journey Tests

1. Browse journey:
- Use Buy search and category filter.
- Confirm listing details panel shows category, location, and price.

2. Sell journey:
- Create listing from Sell form.
- Add image URL.
- Publish listing and verify it appears on Buy page.
- Update status to sold and archived.

3. Chat journey:
- Start conversation from Buy -> Message seller.
- Verify Chat page opens selected conversation.
- Send messages from both sessions.
- Confirm realtime updates arrive without manual refresh.

## 4) Regression Checks

1. Run `bun run lint`.
2. Run `bun run build`.
3. Confirm no console errors during login, listing save, or message send.
