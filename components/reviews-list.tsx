"use client"

import { useEffect, useState } from "react"
import { Star, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Review {
  id: string
  rating: number
  review_text: string
  created_at: string
  reviewer: {
    full_name: string
    user_type: string
  }
  contract: {
    crop_type: string
    created_at: string
  }
}

interface ReviewsListProps {
  userId: string
  limit?: number
}

export function ReviewsList({ userId, limit = 5 }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/ratings?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setReviews(data.reviews.slice(0, limit))
        }
      } catch (error) {
        console.error("[v0] Error fetching reviews:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [userId, limit])

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading reviews...</div>
  }

  if (reviews.length === 0) {
    return <div className="text-center py-4 text-gray-500">No reviews yet</div>
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{review.reviewer.full_name}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {review.reviewer.user_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {review.review_text && <p className="text-sm text-gray-700">{review.review_text}</p>}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{review.contract.crop_type} contract</span>
                <span>•</span>
                <span>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
