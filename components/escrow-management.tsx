"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Shield, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface EscrowAccount {
  id: string
  contract_id: string
  total_amount: number
  platform_commission: number
  farmer_amount: number
  status: string
  funded_at: string | null
  released_at: string | null
  contract: {
    crop_type: string
    quantity: number
    delivery_date: string
  }
  transactions: Array<{
    id: string
    transaction_type: string
    amount: number
    status: string
    created_at: string
  }>
}

export function EscrowManagement() {
  const [escrowAccounts, setEscrowAccounts] = useState<EscrowAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [releaseNotes, setReleaseNotes] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchEscrowAccounts()
  }, [])

  const fetchEscrowAccounts = async () => {
    try {
      const response = await fetch("/api/payments/escrow")
      const data = await response.json()
      setEscrowAccounts(data.escrow_accounts || [])
    } catch (error) {
      console.error("Failed to fetch escrow accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReleasePayment = async (escrowId: string) => {
    try {
      const response = await fetch("/api/payments/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrow_id: escrowId,
          verification_notes: releaseNotes[escrowId] || "",
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("Payment released successfully!")
        fetchEscrowAccounts() // Refresh the list
      } else {
        alert(data.message || "Failed to release payment")
      }
    } catch (error) {
      console.error("Release payment error:", error)
      alert("Failed to release payment")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "funded":
        return <Shield className="h-4 w-4 text-blue-600" />
      case "released":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "funded":
        return "bg-blue-100 text-blue-800"
      case "released":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading escrow accounts...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Escrow Management</h2>
        <p className="text-muted-foreground">Manage secure payments and releases</p>
      </div>

      {escrowAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No escrow accounts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {escrowAccounts.map((escrow) => (
            <Card key={escrow.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(escrow.status)}
                    {escrow.contract.crop_type} Contract
                  </CardTitle>
                  <Badge className={getStatusColor(escrow.status)}>
                    {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
                  </Badge>
                </div>
                <CardDescription>
                  {escrow.contract.quantity} tons • Delivery:{" "}
                  {new Date(escrow.contract.delivery_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Total Amount</Label>
                    <p className="font-medium">${escrow.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Platform Commission</Label>
                    <p className="font-medium">${escrow.platform_commission.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Farmer Amount</Label>
                    <p className="font-medium">${escrow.farmer_amount.toFixed(2)}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Transaction History</Label>
                  <div className="mt-2 space-y-2">
                    {escrow.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center text-sm">
                        <span className="capitalize">{transaction.transaction_type.replace("_", " ")}</span>
                        <div className="flex items-center gap-2">
                          <span>${transaction.amount.toFixed(2)}</span>
                          <Badge variant="outline" className="text-xs">
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {escrow.status === "funded" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label htmlFor={`notes-${escrow.id}`}>Delivery Verification Notes</Label>
                      <Textarea
                        id={`notes-${escrow.id}`}
                        placeholder="Confirm delivery quality, quantity, and any other relevant details..."
                        value={releaseNotes[escrow.id] || ""}
                        onChange={(e) => setReleaseNotes((prev) => ({ ...prev, [escrow.id]: e.target.value }))}
                      />
                    </div>
                    <Button onClick={() => handleReleasePayment(escrow.id)} className="w-full">
                      Release Payment to Farmer
                    </Button>
                  </div>
                )}

                {escrow.status === "released" && escrow.released_at && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                    Payment released on {new Date(escrow.released_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
