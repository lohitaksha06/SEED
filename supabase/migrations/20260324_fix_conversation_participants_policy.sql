-- Fix recursive policy on conversation_participants
-- Run this in Supabase SQL Editor for existing environments.

begin;

drop policy if exists conversation_participants_select_participants on public.conversation_participants;

create policy conversation_participants_select_participants
  on public.conversation_participants
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_participants.conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

commit;
