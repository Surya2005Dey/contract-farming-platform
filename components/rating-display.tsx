import { Star } from "lucide-react"

interface RatingDisplayProps {
  rating: number
  totalReviews: number
  showCount?: boolean
  size?: "sm" | "md" | "lg"
}

export function RatingDisplay({ rating, totalReviews, showCount = true, size = "md" }: RatingDisplayProps) {
  const starSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-6 w-6" : "h-4 w-4"
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm"

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
      <span className={`font-medium ${textSize}`}>{rating.toFixed(1)}</span>
      {showCount && (
        <span className={`text-gray-500 ${textSize}`}>
          ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
        </span>
      )}
    </div>
  )
}

interface RatingBreakdownProps {
  summary: {
    average_rating: number
    total_reviews: number
    five_star_count: number
    four_star_count: number
    three_star_count: number
    two_star_count: number
    one_star_count: number
  }
}

export function RatingBreakdown({ summary }: RatingBreakdownProps) {
  const { total_reviews } = summary

  if (total_reviews === 0) {
    return <div className="text-center py-8 text-gray-500">No reviews yet</div>
  }

  const breakdown = [
    { stars: 5, count: summary.five_star_count },
    { stars: 4, count: summary.four_star_count },
    { stars: 3, count: summary.three_star_count },
    { stars: 2, count: summary.two_star_count },
    { stars: 1, count: summary.one_star_count },
  ]

  return (
    <div className="space-y-2">
      {breakdown.map(({ stars, count }) => {
        const percentage = total_reviews > 0 ? (count / total_reviews) * 100 : 0
        return (
          <div key={stars} className="flex items-center gap-2 text-sm">
            <span className="w-8">{stars}★</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-gray-600">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
