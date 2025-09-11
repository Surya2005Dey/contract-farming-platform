"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Truck, Package, MapPin, Clock, DollarSign, Star } from "lucide-react"

interface LogisticsDashboardProps {
  contractId?: string
}

export function LogisticsDashboard({ contractId }: LogisticsDashboardProps) {
  const [quotes, setQuotes] = useState([])
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(false)
  const [quoteForm, setQuoteForm] = useState({
    origin_address: "",
    destination_address: "",
    weight: "",
    service_type: "standard",
  })

  useEffect(() => {
    if (contractId) {
      fetchQuotes()
      fetchShipments()
    }
  }, [contractId])

  const fetchQuotes = async () => {
    try {
      const response = await fetch(`/api/logistics/quotes?contract_id=${contractId}`)
      const data = await response.json()
      if (data.quotes) {
        setQuotes(data.quotes)
      }
    } catch (error) {
      console.error("Error fetching quotes:", error)
    }
  }

  const fetchShipments = async () => {
    try {
      const response = await fetch(`/api/logistics/shipments?contract_id=${contractId}`)
      const data = await response.json()
      if (data.shipments) {
        setShipments(data.shipments)
      }
    } catch (error) {
      console.error("Error fetching shipments:", error)
    }
  }

  const requestQuotes = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/logistics/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contractId,
          ...quoteForm,
          weight: Number.parseFloat(quoteForm.weight),
        }),
      })
      const data = await response.json()
      if (data.quotes) {
        setQuotes(data.quotes)
      }
    } catch (error) {
      console.error("Error requesting quotes:", error)
    } finally {
      setLoading(false)
    }
  }

  const bookShipment = async (quoteId: string, pickupDate: string) => {
    try {
      const response = await fetch("/api/logistics/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quoteId,
          pickup_date: pickupDate,
        }),
      })
      const data = await response.json()
      if (data.shipment) {
        fetchShipments()
        fetchQuotes()
      }
    } catch (error) {
      console.error("Error booking shipment:", error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      booked: "bg-blue-100 text-blue-800",
      picked_up: "bg-purple-100 text-purple-800",
      in_transit: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quotes">Shipping Quotes</TabsTrigger>
          <TabsTrigger value="shipments">Active Shipments</TabsTrigger>
          <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Request Shipping Quotes
              </CardTitle>
              <CardDescription>Get quotes from multiple logistics providers for your shipment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin">Origin Address</Label>
                  <Input
                    id="origin"
                    value={quoteForm.origin_address}
                    onChange={(e) => setQuoteForm((prev) => ({ ...prev, origin_address: e.target.value }))}
                    placeholder="Pickup location"
                  />
                </div>
                <div>
                  <Label htmlFor="destination">Destination Address</Label>
                  <Input
                    id="destination"
                    value={quoteForm.destination_address}
                    onChange={(e) => setQuoteForm((prev) => ({ ...prev, destination_address: e.target.value }))}
                    placeholder="Delivery location"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={quoteForm.weight}
                    onChange={(e) => setQuoteForm((prev) => ({ ...prev, weight: e.target.value }))}
                    placeholder="Total weight"
                  />
                </div>
                <div>
                  <Label htmlFor="service">Service Type</Label>
                  <Select
                    value={quoteForm.service_type}
                    onValueChange={(value) => setQuoteForm((prev) => ({ ...prev, service_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="refrigerated">Refrigerated</SelectItem>
                      <SelectItem value="bulk">Bulk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={requestQuotes} disabled={loading} className="w-full">
                {loading ? "Requesting Quotes..." : "Get Quotes"}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {quotes.map((quote: any) => (
              <Card key={quote.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{quote.logistics_providers.name}</h3>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{quote.logistics_providers.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />${quote.estimated_cost}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {quote.estimated_delivery_days} days
                        </div>
                        <Badge variant="outline">{quote.service_type}</Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const pickupDate = new Date()
                        pickupDate.setDate(pickupDate.getDate() + 1)
                        bookShipment(quote.id, pickupDate.toISOString().split("T")[0])
                      }}
                      disabled={quote.status !== "pending"}
                    >
                      Book Shipment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shipments" className="space-y-4">
          <div className="grid gap-4">
            {shipments.map((shipment: any) => (
              <Card key={shipment.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">Tracking: {shipment.tracking_number}</h3>
                      <p className="text-sm text-gray-600">{shipment.shipping_quotes.logistics_providers.name}</p>
                    </div>
                    <Badge className={getStatusColor(shipment.status)}>{shipment.status.replace("_", " ")}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Pickup Date</Label>
                      <p>{shipment.pickup_date}</p>
                    </div>
                    <div>
                      <Label>Est. Delivery</Label>
                      <p>{shipment.estimated_delivery_date}</p>
                    </div>
                    <div>
                      <Label>Current Location</Label>
                      <p className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {shipment.current_location}
                      </p>
                    </div>
                    <div>
                      <Label>Service Type</Label>
                      <p>{shipment.shipping_quotes.service_type}</p>
                    </div>
                  </div>

                  {shipment.shipment_tracking && shipment.shipment_tracking.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-sm font-medium">Tracking History</Label>
                      <div className="mt-2 space-y-2">
                        {shipment.shipment_tracking.slice(0, 3).map((event: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{event.description}</span>
                            <span className="text-gray-500">{new Date(event.timestamp).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="warehouse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Warehouse & Storage
              </CardTitle>
              <CardDescription>Book warehouse and cold storage facilities for your produce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Warehouse booking functionality coming soon</p>
                <p className="text-sm">Connect with storage providers for your contracts</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
