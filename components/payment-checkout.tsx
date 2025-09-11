"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Shield, CreditCard, Lock } from "lucide-react"

interface PaymentCheckoutProps {
  contract: {
    id: string
    crop_type: string
    quantity: number
    price_per_unit: number
    total_amount: number
    farmer: { full_name: string }
  }
  onPaymentSuccess: (escrowId: string) => void
}

export function PaymentCheckout({ contract, onPaymentSuccess }: PaymentCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState("")
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const commission = contract.total_amount * 0.05
  const farmerAmount = contract.total_amount - commission

  const handlePayment = async () => {
    setIsProcessing(true)

    try {
      // Create escrow account
      const escrowResponse = await fetch("/api/payments/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contract.id,
          payment_method: paymentMethod,
        }),
      })

      const escrowData = await escrowResponse.json()

      if (!escrowResponse.ok) {
        throw new Error(escrowData.error)
      }

      // Process payment
      const paymentResponse = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: escrowData.transaction_id,
          payment_details: {
            method: paymentMethod,
            card: paymentMethod === "card" ? cardDetails : null,
          },
        }),
      })

      const paymentData = await paymentResponse.json()

      if (paymentData.success) {
        onPaymentSuccess(escrowData.escrow_id)
      } else {
        alert(paymentData.message)
      }
    } catch (error) {
      console.error("Payment error:", error)
      alert("Payment failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Contract Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Secure Payment - Contract Summary
          </CardTitle>
          <CardDescription>Payment will be held in escrow until delivery confirmation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Farmer</Label>
              <p className="font-medium">{contract.farmer.full_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Crop</Label>
              <p className="font-medium">{contract.crop_type}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Quantity</Label>
              <p className="font-medium">{contract.quantity} tons</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Price per unit</Label>
              <p className="font-medium">${contract.price_per_unit}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Contract Amount</span>
              <span className="font-medium">${contract.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Platform Commission (5%)</span>
              <span>-${commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Amount to Farmer</span>
              <span>${farmerAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Payment</span>
              <span>${contract.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payment-method">Select Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Choose payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="wallet">Digital Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "card" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-name">Cardholder Name</Label>
                <Input
                  id="card-name"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails((prev) => ({ ...prev, number: e.target.value }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card-expiry">Expiry Date</Label>
                  <Input
                    id="card-expiry"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails((prev) => ({ ...prev, expiry: e.target.value }))}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="card-cvv">CVV</Label>
                  <Input
                    id="card-cvv"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails((prev) => ({ ...prev, cvv: e.target.value }))}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "bank" && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Bank transfer details will be provided after confirmation. Payment will be held in escrow until delivery
                verification.
              </p>
            </div>
          )}

          {paymentMethod === "wallet" && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                You will be redirected to your digital wallet provider to complete the payment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-800">Secure Escrow Protection</p>
              <p className="text-muted-foreground mt-1">
                Your payment is protected by our escrow system. Funds will only be released to the farmer after you
                confirm successful delivery and quality of the produce.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Button onClick={handlePayment} disabled={!paymentMethod || isProcessing} className="w-full" size="lg">
        {isProcessing ? "Processing Payment..." : `Pay $${contract.total_amount.toFixed(2)} Securely`}
      </Button>
    </div>
  )
}
