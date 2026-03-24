import { useSearchParams } from "react-router-dom"

export function ChatPage() {
  const [searchParams] = useSearchParams()
  const conversationId = searchParams.get("conversation")

  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Chat</h2>
      <p className="text-sm text-muted-foreground">
        Milestone 1 scaffold ready. Next we will add conversation list, message thread, and realtime updates.
      </p>

      {conversationId ? (
        <p className="text-sm text-muted-foreground">Selected conversation: {conversationId}</p>
      ) : null}
    </section>
  )
}