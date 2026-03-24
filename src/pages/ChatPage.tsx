import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth/useAuth"
import { supabase } from "@/lib/supabase"

type Profile = {
  id: string
  display_name: string | null
}

type Listing = {
  id: string
  title: string
  price_amount: string
  currency_code: string
  status: "draft" | "published" | "sold" | "archived"
}

type RawConversation = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_at: string
  listings: Listing[] | Listing | null
  buyer: Profile[] | Profile | null
  seller: Profile[] | Profile | null
}

type Conversation = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_at: string
  listing: Listing | null
  buyer: Profile | null
  seller: Profile | null
  latestMessage: Message | null
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

export function ChatPage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [conversationError, setConversationError] = useState<string | null>(null)

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get("conversation"),
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)

  const [draftMessage, setDraftMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  useEffect(() => {
    if (!session) {
      return
    }

    const loadConversations = async () => {
      setIsLoadingConversations(true)
      setConversationError(null)

      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id, listing_id, buyer_id, seller_id, created_at, listings(id, title, price_amount, currency_code, status), buyer:profiles!conversations_buyer_id_fkey(id, display_name), seller:profiles!conversations_seller_id_fkey(id, display_name)",
        )
        .order("created_at", { ascending: false })

      if (error) {
        setConversationError(error.message)
        setConversations([])
        setIsLoadingConversations(false)
        return
      }

      const normalizedConversations = normalizeConversations((data ?? []) as RawConversation[])

      const { data: messageData, error: messageLookupError } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .order("created_at", { ascending: false })

      if (messageLookupError) {
        setConversationError(messageLookupError.message)
      }

      const latestByConversation = new Map<string, Message>()
      for (const message of (messageData ?? []) as Message[]) {
        if (!latestByConversation.has(message.conversation_id)) {
          latestByConversation.set(message.conversation_id, message)
        }
      }

      const withLatestMessages = normalizedConversations.map((conversation) => ({
        ...conversation,
        latestMessage: latestByConversation.get(conversation.id) ?? null,
      }))

      setConversations(withLatestMessages)
      setIsLoadingConversations(false)

      const conversationFromUrl = searchParams.get("conversation")
      if (conversationFromUrl && withLatestMessages.some((conversation) => conversation.id === conversationFromUrl)) {
        setSelectedConversationId(conversationFromUrl)
        return
      }

      if (!selectedConversationId && withLatestMessages.length > 0) {
        setSelectedConversationId(withLatestMessages[0].id)
      }
    }

    loadConversations()
  }, [searchParams, selectedConversationId, session])

  useEffect(() => {
    if (!selectedConversationId) {
      return
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      setMessageError(null)

      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true })

      if (error) {
        setMessageError(error.message)
        setMessages([])
        setIsLoadingMessages(false)
        return
      }

      setMessages((data ?? []) as Message[])
      setIsLoadingMessages(false)
    }

    loadMessages()
  }, [selectedConversationId])

  useEffect(() => {
    if (!session) {
      return
    }

    const channel = supabase
      .channel(`messages:${session.user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as Message

        setConversations((previousConversations) => {
          const exists = previousConversations.some((conversation) => conversation.id === message.conversation_id)
          if (!exists) {
            return previousConversations
          }

          return previousConversations
            .map((conversation) =>
              conversation.id === message.conversation_id
                ? {
                    ...conversation,
                    latestMessage: message,
                  }
                : conversation,
            )
            .sort((a, b) => {
              const aTime = a.latestMessage?.created_at ?? a.created_at
              const bTime = b.latestMessage?.created_at ?? b.created_at
              return bTime.localeCompare(aTime)
            })
        })

        if (selectedConversationId === message.conversation_id) {
          setMessages((previousMessages) => {
            if (previousMessages.some((existingMessage) => existingMessage.id === message.id)) {
              return previousMessages
            }

            return [...previousMessages, message]
          })
        }
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [selectedConversationId, session])

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  const onSelectConversation = (conversationId: string) => {
    setMessages([])
    setSelectedConversationId(conversationId)
    setSearchParams({ conversation: conversationId })
    setDraftMessage("")
  }

  const onSendMessage = async () => {
    if (!session || !selectedConversationId) {
      return
    }

    const trimmedBody = draftMessage.trim()
    if (!trimmedBody) {
      return
    }

    setIsSending(true)
    setMessageError(null)

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversationId,
      sender_id: session.user.id,
      body: trimmedBody,
    })

    setIsSending(false)

    if (error) {
      setMessageError(error.message)
      return
    }

    setDraftMessage("")
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Your buyer-seller chats across listings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {conversationError ? <p className="text-sm text-destructive">{conversationError}</p> : null}
          {isLoadingConversations ? <p className="text-sm text-muted-foreground">Loading conversations...</p> : null}

          {!isLoadingConversations && conversations.length === 0 ? (
            <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">No conversations yet</p>
              <p className="text-muted-foreground">Start from Buy page by clicking Message seller.</p>
              <Link to="/buy" className="inline-block">
                <Button variant="outline" size="sm">
                  Go to Buy
                </Button>
              </Link>
            </div>
          ) : null}

          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isSelected = selectedConversationId === conversation.id
              const counterpartLabel = getCounterpartLabel(conversation, session?.user.id)

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full rounded-md border p-2 text-left transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-medium">{counterpartLabel}</p>
                  <p className="text-xs text-muted-foreground">{conversation.listing?.title ?? "Listing"}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {conversation.latestMessage?.body ?? "No messages yet"}
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[560px]">
        <CardHeader>
          <CardTitle>{selectedConversation?.listing?.title ?? "Select a conversation"}</CardTitle>
          <CardDescription>
            {selectedConversation
              ? `${formatCurrency(selectedConversation.listing?.price_amount, selectedConversation.listing?.currency_code)} • ${selectedConversation.listing?.status ?? ""}`
              : "Choose a conversation from the left panel to begin chatting."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex h-[480px] flex-col gap-3">
          {isLoadingMessages ? <p className="text-sm text-muted-foreground">Loading messages...</p> : null}
          {messageError ? <p className="text-sm text-destructive">{messageError}</p> : null}

          <div className="flex-1 space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-3">
            {selectedConversation && messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</p>
            ) : null}

            {messages.map((message) => {
              const isOwnMessage = message.sender_id === session?.user.id

              return (
                <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isOwnMessage ? "bg-primary text-primary-foreground" : "border bg-background"
                    }`}
                  >
                    <p>{message.body}</p>
                    <p className={`mt-1 text-[10px] ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}

            <div ref={scrollAnchorRef} />
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder={selectedConversation ? "Type a message" : "Select a conversation first"}
              disabled={!selectedConversation || isSending}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void onSendMessage()
                }
              }}
            />
            <Button onClick={() => void onSendMessage()} disabled={!selectedConversation || isSending}>
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function normalizeConversations(rawConversations: RawConversation[]): Conversation[] {
  return rawConversations.map((conversation) => ({
    id: conversation.id,
    listing_id: conversation.listing_id,
    buyer_id: conversation.buyer_id,
    seller_id: conversation.seller_id,
    created_at: conversation.created_at,
    listing: Array.isArray(conversation.listings) ? (conversation.listings[0] ?? null) : conversation.listings,
    buyer: Array.isArray(conversation.buyer) ? (conversation.buyer[0] ?? null) : conversation.buyer,
    seller: Array.isArray(conversation.seller) ? (conversation.seller[0] ?? null) : conversation.seller,
    latestMessage: null,
  }))
}

function getCounterpartLabel(conversation: Conversation, currentUserId: string | undefined): string {
  if (!currentUserId) {
    return "Conversation"
  }

  if (conversation.buyer_id === currentUserId) {
    return conversation.seller?.display_name || "Seller"
  }

  return conversation.buyer?.display_name || "Buyer"
}

function formatTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(parsed)
}

function formatCurrency(priceAmount: string | undefined, currencyCode: string | undefined): string {
  if (!priceAmount || !currencyCode) {
    return ""
  }

  const parsedPrice = Number(priceAmount)
  if (Number.isNaN(parsedPrice)) {
    return `${currencyCode} ${priceAmount}`
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(parsedPrice)
}