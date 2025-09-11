"use client"

import { useState, useEffect } from "react"
import { SearchFilters, type SearchFilters as SearchFiltersType } from "@/components/search-filters"
import { ContractCard } from "@/components/contract-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"

interface Contract {
  id: string
  crop_type: string
  quantity: number
  price_per_unit: number
  total_amount: number
  delivery_date: string
  quality_standards?: string
  status: string
  farmer: {
    full_name: string
    location: string
    specialization: string[]
  }
  buyer?: {
    full_name: string
    location: string
    company_name?: string
  }
}

interface MarketplaceSearchProps {
  userType: "farmer" | "buyer"
}

export function MarketplaceSearch({ userType }: MarketplaceSearchProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (filters: SearchFiltersType) => {
    setLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/search/contracts?${params.toString()}`)
      const data = await response.json()

      if (data.contracts) {
        setContracts(data.contracts)
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleSearch({ status: "pending" })
  }, [])

  const handleViewDetails = (contractId: string) => {
    // TODO: Navigate to contract details page
    console.log("View contract details:", contractId)
  }

  const handlePlaceBid = (contractId: string) => {
    // TODO: Open bid placement modal
    console.log("Place bid on contract:", contractId)
  }

  const handleCreateContract = () => {
    // TODO: Navigate to contract creation page
    console.log("Create new contract")
  }

  return (
    <div className="space-y-6">
      <SearchFilters onSearch={handleSearch} loading={loading} />

      {userType === "farmer" && (
        <div className="flex justify-end">
          <Button onClick={handleCreateContract} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Contract
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Searching contracts...</span>
            </CardContent>
          </Card>
        ) : hasSearched && contracts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">No contracts found matching your criteria</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search filters or check back later for new opportunities
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {contracts.length > 0 && (
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {contracts.length} Contract{contracts.length !== 1 ? "s" : ""} Found
                </h3>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  userType={userType}
                  onViewDetails={handleViewDetails}
                  onPlaceBid={userType === "buyer" ? handlePlaceBid : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
