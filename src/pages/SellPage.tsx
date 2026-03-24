import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/useAuth"
import { supabase } from "@/lib/supabase"

type ListingStatus = "draft" | "published" | "sold" | "archived"

type Category = {
  id: number
  name: string
  slug: string
}

type ListingImage = {
  id?: string
  image_url: string
  sort_order: number
}

type RawListing = {
  id: string
  seller_id: string
  category_id: number
  title: string
  description: string
  price_amount: string
  currency_code: string
  status: ListingStatus
  location_text: string | null
  created_at: string
  categories: Category[] | Category | null
  listing_images: ListingImage[]
}

type Listing = Omit<RawListing, "categories"> & {
  categories: Category | null
}

type ListingFormState = {
  id: string | null
  title: string
  description: string
  categoryId: string
  priceAmount: string
  currencyCode: string
  locationText: string
  imageUrl: string
}

const DEFAULT_FORM: ListingFormState = {
  id: null,
  title: "",
  description: "",
  categoryId: "",
  priceAmount: "",
  currencyCode: "INR",
  locationText: "",
  imageUrl: "",
}

const STATUS_OPTIONS: ListingStatus[] = ["draft", "published", "sold", "archived"]

const DEMO_LISTING_IDEAS = [
  "iPhone 12, 128GB, 85% battery",
  "Ergonomic office chair, less than 1 year used",
  "Nike running shoes size 9, almost new",
]

export function SellPage() {
  const { session } = useAuth()

  const [categories, setCategories] = useState<Category[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formState, setFormState] = useState<ListingFormState>(DEFAULT_FORM)
  const [selectedStatus, setSelectedStatus] = useState<ListingStatus>("draft")
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      return
    }

    const loadSellData = async () => {
      setIsLoading(true)
      setError(null)

      const profileError = await ensureProfile(session.user.id, session.user.email)
      if (profileError) {
        setError(profileError)
        setIsLoading(false)
        return
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true })

      if (categoriesError) {
        setError(categoriesError.message)
        setIsLoading(false)
        return
      }

      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select(
          "id, seller_id, category_id, title, description, price_amount, currency_code, status, location_text, created_at, categories(id, name, slug), listing_images(id, image_url, sort_order)",
        )
        .eq("seller_id", session.user.id)
        .order("created_at", { ascending: false })

      if (listingsError) {
        setError(listingsError.message)
        setIsLoading(false)
        return
      }

      const nextCategories = (categoriesData ?? []) as Category[]
      setCategories(nextCategories)

      setFormState((prev) => {
        if (prev.categoryId || nextCategories.length === 0) {
          return prev
        }

        return {
          ...prev,
          categoryId: String(nextCategories[0].id),
        }
      })

      setListings(normalizeListings((listingsData ?? []) as RawListing[]))
      setIsLoading(false)
    }

    loadSellData()
  }, [session])

  const listingCountByStatus = useMemo(() => {
    return STATUS_OPTIONS.reduce<Record<ListingStatus, number>>(
      (acc, status) => {
        acc[status] = listings.filter((listing) => listing.status === status).length
        return acc
      },
      { draft: 0, published: 0, sold: 0, archived: 0 },
    )
  }, [listings])

  const onChangeForm = (field: keyof ListingFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormState({
      ...DEFAULT_FORM,
      categoryId: categories[0] ? String(categories[0].id) : "",
    })
    setSelectedStatus("draft")
    setFormError(null)
  }

  const onEdit = (listing: Listing) => {
    setFormState({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      categoryId: String(listing.category_id),
      priceAmount: String(listing.price_amount),
      currencyCode: listing.currency_code,
      locationText: listing.location_text ?? "",
      imageUrl: listing.listing_images[0]?.image_url ?? "",
    })
    setSelectedStatus(listing.status)
    setFormError(null)
  }

  const reloadListings = async () => {
    if (!session) {
      return
    }

    const { data, error: listingsError } = await supabase
      .from("listings")
      .select(
        "id, seller_id, category_id, title, description, price_amount, currency_code, status, location_text, created_at, categories(id, name, slug), listing_images(id, image_url, sort_order)",
      )
      .eq("seller_id", session.user.id)
      .order("created_at", { ascending: false })

    if (listingsError) {
      setError(listingsError.message)
      return
    }

    setListings(normalizeListings((data ?? []) as RawListing[]))
  }

  const onSave = async () => {
    if (!session) {
      return
    }

    setFormError(null)

    if (!formState.title.trim() || !formState.description.trim() || !formState.categoryId || !formState.priceAmount) {
      setFormError("Please fill title, description, category, and price.")
      return
    }

    const parsedPrice = Number(formState.priceAmount)
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError("Price must be a valid non-negative number.")
      return
    }

    const currencyCode = formState.currencyCode.trim().toUpperCase()
    if (currencyCode.length !== 3) {
      setFormError("Currency code must be 3 letters, for example INR.")
      return
    }

    setIsSaving(true)

    const listingPayload = {
      seller_id: session.user.id,
      category_id: Number(formState.categoryId),
      title: formState.title.trim(),
      description: formState.description.trim(),
      price_amount: parsedPrice,
      currency_code: currencyCode,
      status: selectedStatus,
      location_text: formState.locationText.trim() || null,
    }

    let listingId = formState.id

    if (listingId) {
      const { error: updateError } = await supabase.from("listings").update(listingPayload).eq("id", listingId)
      if (updateError) {
        setFormError(updateError.message)
        setIsSaving(false)
        return
      }
    } else {
      const { data, error: insertError } = await supabase.from("listings").insert(listingPayload).select("id").single()

      if (insertError) {
        setFormError(insertError.message)
        setIsSaving(false)
        return
      }

      listingId = data.id as string
    }

    if (listingId) {
      const trimmedImage = formState.imageUrl.trim()

      const { error: deleteImagesError } = await supabase.from("listing_images").delete().eq("listing_id", listingId)
      if (deleteImagesError) {
        setFormError(deleteImagesError.message)
        setIsSaving(false)
        return
      }

      if (trimmedImage) {
        const { error: insertImageError } = await supabase.from("listing_images").insert({
          listing_id: listingId,
          image_url: trimmedImage,
          sort_order: 0,
        })

        if (insertImageError) {
          setFormError(insertImageError.message)
          setIsSaving(false)
          return
        }
      }
    }

    await reloadListings()
    setIsSaving(false)
    resetForm()
  }

  const updateStatus = async (listingId: string, status: ListingStatus) => {
    setIsUpdatingStatus(`${listingId}:${status}`)

    const { error: updateError } = await supabase.from("listings").update({ status }).eq("id", listingId)

    setIsUpdatingStatus(null)

    if (updateError) {
      setError(updateError.message)
      return
    }

    await reloadListings()
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Seller dashboard</CardTitle>
            <CardDescription>Track listing status and keep your inventory updated.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {STATUS_OPTIONS.map((status) => (
                <Card key={status} className="bg-muted/40">
                  <CardContent className="p-3">
                    <p className="text-xs uppercase text-muted-foreground">{status}</p>
                    <p className="text-2xl font-semibold">{listingCountByStatus[status]}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading your listings...</p> : null}

        {!isLoading && listings.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No listings yet</CardTitle>
              <CardDescription>Use the form on the right to create your first product listing.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <div className="grid gap-3">
          {listings.map((listing) => {
            const imageUrl = listing.listing_images[0]?.image_url
            const isBusy = (isUpdatingStatus?.startsWith(`${listing.id}:`) ?? false) || isSaving

            return (
              <Card key={listing.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{listing.title}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{listing.categories?.name ?? "Uncategorized"}</span>
                        <span>•</span>
                        <span>{listing.currency_code} {listing.price_amount}</span>
                      </div>
                    </div>
                    <Badge>{listing.status}</Badge>
                  </div>

                  {imageUrl ? <img src={imageUrl} alt={listing.title} className="h-32 w-full rounded-md border object-cover" /> : null}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(listing)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" disabled={isBusy || listing.status === "draft"} onClick={() => updateStatus(listing.id, "draft")}>
                      Draft
                    </Button>
                    <Button size="sm" disabled={isBusy || listing.status === "published"} onClick={() => updateStatus(listing.id, "published")}>
                      Publish
                    </Button>
                    <Button size="sm" variant="outline" disabled={isBusy || listing.status === "sold"} onClick={() => updateStatus(listing.id, "sold")}>
                      Sold
                    </Button>
                    <Button size="sm" variant="outline" disabled={isBusy || listing.status === "archived"} onClick={() => updateStatus(listing.id, "archived")}>
                      Archive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{formState.id ? "Edit listing" : "Create listing"}</CardTitle>
            <CardDescription>Use clean titles and specific details for better buyer response.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={resetForm}>New</Button>
              <Button onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : formState.id ? "Update" : "Create"}</Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="listing-title">Title</Label>
              <Input
                id="listing-title"
                value={formState.title}
                onChange={(event) => onChangeForm("title", event.target.value)}
                placeholder="Product title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="listing-description">Description</Label>
              <Textarea
                id="listing-description"
                value={formState.description}
                onChange={(event) => onChangeForm("description", event.target.value)}
                placeholder="Condition, usage, included items"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="listing-category">Category</Label>
              <select
                id="listing-category"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={formState.categoryId}
                onChange={(event) => onChangeForm("categoryId", event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="listing-price">Price</Label>
                <Input
                  id="listing-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.priceAmount}
                  onChange={(event) => onChangeForm("priceAmount", event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="listing-currency">Currency</Label>
                <Input
                  id="listing-currency"
                  value={formState.currencyCode}
                  onChange={(event) => onChangeForm("currencyCode", event.target.value)}
                  maxLength={3}
                  placeholder="INR"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="listing-location">Location</Label>
              <Input
                id="listing-location"
                value={formState.locationText}
                onChange={(event) => onChangeForm("locationText", event.target.value)}
                placeholder="City or area"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="listing-image">Image URL</Label>
              <Input
                id="listing-image"
                value={formState.imageUrl}
                onChange={(event) => onChangeForm("imageUrl", event.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="listing-status">Status</Label>
              <select
                id="listing-status"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as ListingStatus)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo listing ideas</CardTitle>
            <CardDescription>Use these sample titles when testing the full journey.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEMO_LISTING_IDEAS.map((idea) => (
              <div key={idea} className="rounded-md border bg-muted/40 p-2 text-sm">
                {idea}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function normalizeListings(rawListings: RawListing[]): Listing[] {
  return rawListings.map((listing) => {
    const categories = Array.isArray(listing.categories) ? (listing.categories[0] ?? null) : listing.categories

    return {
      ...listing,
      categories,
      listing_images: [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }
  })
}

async function ensureProfile(userId: string, email: string | undefined): Promise<string | null> {
  const fallbackName = email ? email.split("@")[0] : null

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: fallbackName,
    },
    { onConflict: "id" },
  )

  return error?.message ?? null
}
