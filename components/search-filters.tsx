"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, MapPin, Calendar, Package, DollarSign } from "lucide-react"

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void
  loading?: boolean
}

export interface SearchFilters {
  crop_type?: string
  location?: string
  min_quantity?: string
  max_quantity?: string
  min_price?: string
  max_price?: string
  delivery_from?: string
  delivery_to?: string
  status?: string
}

export function SearchFilters({ onSearch, loading }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    status: "pending",
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    onSearch(filters)
  }

  const clearFilters = () => {
    setFilters({ status: "pending" })
    onSearch({ status: "pending" })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Contracts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="crop_type">Crop Type</Label>
            <Input
              id="crop_type"
              placeholder="e.g., Rice, Wheat, Corn"
              value={filters.crop_type || ""}
              onChange={(e) => handleFilterChange("crop_type", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="City, State"
                className="pl-10"
                value={filters.location || ""}
                onChange={(e) => handleFilterChange("location", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Available</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Advanced Filters
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Quantity Range (tons)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filters.min_quantity || ""}
                    onChange={(e) => handleFilterChange("min_quantity", e.target.value)}
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={filters.max_quantity || ""}
                    onChange={(e) => handleFilterChange("max_quantity", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Price Range (per unit)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filters.min_price || ""}
                    onChange={(e) => handleFilterChange("min_price", e.target.value)}
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={filters.max_price || ""}
                    onChange={(e) => handleFilterChange("max_price", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Delivery Date Range
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.delivery_from || ""}
                  onChange={(e) => handleFilterChange("delivery_from", e.target.value)}
                />
                <Input
                  type="date"
                  value={filters.delivery_to || ""}
                  onChange={(e) => handleFilterChange("delivery_to", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
