import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/useAuth"
import { supabase } from "@/lib/supabase"

type Category = {
  id: number
  slug: string
  name: string
}

type ListingImage = {
  image_url: string
  sort_order: number
}

type Listing = {
  id: string
  seller_id: string
  title: string
  description: string
  price_amount: string
  currency_code: string
  location_text: string | null
  status: "draft" | "published" | "sold" | "archived"
  created_at: string
  categories: Category | null
  listing_images: ListingImage[]
}

type RawListing = Omit<Listing, "categories"> & {
  categories: Category[] | Category | null
}

const ALL_CATEGORIES = "all"

export function BuyPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES)
  const [searchQuery, setSearchQuery] = useState("")

  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isStartingChat, setIsStartingChat] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error: categoriesError } = await supabase
        .from("categories")
        .select("id, slug, name")
        .order("name", { ascending: true })

      if (categoriesError) {
        setError(categoriesError.message)
        return
      }

      setCategories((data ?? []) as Category[])
    }

    loadCategories()
  }, [])

  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from("listings")
        .select(
          "id, seller_id, title, description, price_amount, currency_code, location_text, status, created_at, categories(id, slug, name), listing_images(image_url, sort_order)",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })

      if (selectedCategory !== ALL_CATEGORIES) {
        query = query.eq("category_id", selectedCategory)
      }

      const cleanedSearch = searchQuery.trim()
      if (cleanedSearch.length > 0) {
        query = query.or(`title.ilike.%${cleanedSearch}%,description.ilike.%${cleanedSearch}%`)
      }

      const { data, error: listingsError } = await query

      if (listingsError) {
        setError(listingsError.message)
        setListings([])
        setIsLoading(false)
        return
      }

      const normalizedListings = ((data ?? []) as RawListing[])
        .map(normalizeListing)
        .map(sortListingImages)

      setListings(normalizedListings)
      setIsLoading(false)
    }

    loadListings()
  }, [searchQuery, selectedCategory])

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? null,
    [listings, selectedListingId],
  )

  const startChat = async (listing: Listing) => {
    setActionError(null)

    if (!session) {
      navigate("/signin", { state: { from: "/buy" } })
      return
    }

    if (session.user.id === listing.seller_id) {
      setActionError("This is your own listing.")
      return
    }

    setIsStartingChat(true)

    const { data, error: conversationError } = await supabase.rpc("start_listing_conversation", {
      p_listing_id: listing.id,
    })

    setIsStartingChat(false)

    if (conversationError) {
      setActionError(conversationError.message)
      return
    }

    navigate(`/chat?conversation=${data}`)
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Buy</h2>
        <p className="text-sm text-muted-foreground">
          Browse published listings and message sellers directly.
        </p>
      </header>

      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_220px]">
        <label className="space-y-1">
          <span className="text-sm">Search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title or description"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm">Category</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value={ALL_CATEGORIES}>All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading listings...</p> : null}

      {!isLoading && listings.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          No listings found for your filter.
        </p>
      ) : null}

      {listings.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3">
            {listings.map((listing) => {
              const firstImage = listing.listing_images[0]?.image_url
              const priceLabel = formatCurrency(listing.price_amount, listing.currency_code)

              return (
                <article key={listing.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-medium">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{listing.categories?.name ?? "Uncategorized"}</span>
                        <span>•</span>
                        <span>{listing.location_text || "Location not provided"}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold">{priceLabel}</p>
                    </div>
                  </div>

                  {firstImage ? (
                    <img
                      src={firstImage}
                      alt={listing.title}
                      className="mt-3 h-36 w-full rounded-md border object-cover"
                    />
                  ) : null}

                  <div className="mt-3">
                    <Button variant="outline" onClick={() => setSelectedListingId(listing.id)}>
                      View details
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>

          <aside className="h-fit rounded-lg border p-4">
            {selectedListing ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">{selectedListing.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedListing.description}</p>

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Price:</span>{" "}
                    {formatCurrency(selectedListing.price_amount, selectedListing.currency_code)}
                  </p>
                  <p>
                    <span className="font-medium">Category:</span>{" "}
                    {selectedListing.categories?.name ?? "Uncategorized"}
                  </p>
                  <p>
                    <span className="font-medium">Location:</span>{" "}
                    {selectedListing.location_text || "Location not provided"}
                  </p>
                </div>

                <Button onClick={() => startChat(selectedListing)} disabled={isStartingChat}>
                  {isStartingChat ? "Starting chat..." : "Message seller"}
                </Button>

                {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a listing to view details.</p>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  )
}

function sortListingImages(listing: Listing): Listing {
  const listingImages = Array.isArray(listing.listing_images) ? [...listing.listing_images] : []
  listingImages.sort((a, b) => a.sort_order - b.sort_order)

  return {
    ...listing,
    listing_images: listingImages,
  }
}

function formatCurrency(priceAmount: string, currencyCode: string): string {
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

function normalizeListing(rawListing: RawListing): Listing {
  const category = Array.isArray(rawListing.categories)
    ? (rawListing.categories[0] ?? null)
    : rawListing.categories

  return {
    ...rawListing,
    categories: category,
  }
}