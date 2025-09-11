"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface ReviewFormProps {
  contractId: string
  revieweeId: string
  revieweeName: string
  onSubmit: () => void
  onCancel: () => void
}

export function ReviewForm({ contractId, revieweeId, revieweeName, onSubmit, onCancel }: ReviewFormProps) {
  const [ratings, setRatings] = useState({
    communication: 0,
    quality: 0,
    timeliness: 0,
    overall: 0,
  })
  const [reviewText, setReviewText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = [
    { key: "communication", label: "Communication", description: "How well did they communicate?" },
    { key: "quality", label: "Quality", description: "Quality of produce/service" },
    { key: "timeliness", label: "Timeliness", description: "Did they meet deadlines?" },
    { key: "overall", label: "Overall Experience", description: "Overall satisfaction" },
  ]

  const handleRatingChange = (category: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [category]: rating }))
  }

  const handleSubmit = async () => {
    const allRated = Object.values(ratings).every((rating) => rating > 0)
    if (!allRated) {
      alert("Please provide ratings for all categories")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId,
          revieweeId,
          ratings,
          reviewText,
        }),
      })

      if (response.ok) {
        onSubmit()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to submit review")
      }
    } catch (error) {
      console.error("[v0] Error submitting review:", error)
      alert("Failed to submit review")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Rate & Review {revieweeName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map(({ key, label, description }) => (
          <div key={key} className="space-y-2">
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-gray-600">{description}</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(key, star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= ratings[key as keyof typeof ratings]
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 hover:text-yellow-200"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {ratings[key as keyof typeof ratings] > 0 &&
                  `${ratings[key as keyof typeof ratings]} star${ratings[key as keyof typeof ratings] !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="review">Written Review (Optional)</Label>
          <Textarea
            id="review"
            placeholder="Share your experience working with this user..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
