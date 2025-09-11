"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, Package, DollarSign, User, Building } from "lucide-react"

interface ContractCardProps {
  contract: {
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
  userType: "farmer" | "buyer"
  onViewDetails: (contractId: string) => void
  onPlaceBid?: (contractId: string) => void
}

export function ContractCard({ contract, userType, onViewDetails, onPlaceBid }: ContractCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{contract.crop_type}</CardTitle>
          <Badge variant={contract.status === "pending" ? "default" : "secondary"}>{contract.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>{contract.quantity} tons</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{formatCurrency(contract.price_per_unit)}/unit</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(contract.delivery_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{contract.farmer.location}</span>
          </div>
        </div>

        <div className="bg-muted p-3 rounded-lg">
          <div className="text-sm text-muted-foreground">Total Contract Value</div>
          <div className="text-xl font-bold text-primary">{formatCurrency(contract.total_amount)}</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Farmer:</span>
            <span>{contract.farmer.full_name}</span>
          </div>
          {contract.farmer.specialization && (
            <div className="flex flex-wrap gap-1">
              {contract.farmer.specialization.map((crop, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {crop}
                </Badge>
              ))}
            </div>
          )}
          {contract.buyer && (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Buyer:</span>
              <span>{contract.buyer.company_name || contract.buyer.full_name}</span>
            </div>
          )}
        </div>

        {contract.quality_standards && (
          <div className="text-sm">
            <span className="font-medium">Quality Standards:</span>
            <p className="text-muted-foreground mt-1">{contract.quality_standards}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onViewDetails(contract.id)} className="flex-1">
            View Details
          </Button>
          {contract.status === "pending" && onPlaceBid && (
            <Button onClick={() => onPlaceBid(contract.id)} className="flex-1">
              Place Bid
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
