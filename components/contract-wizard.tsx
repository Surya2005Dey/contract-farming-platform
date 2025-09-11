"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Users, Ligature as Signature, CheckCircle } from "lucide-react"

interface ContractTemplate {
  id: string
  name: string
  description: string
  template_fields: Record<string, any>
}

interface ContractWizardProps {
  onComplete: (draftId: string) => void
  onCancel: () => void
}

export function ContractWizard({ onComplete, onCancel }: ContractWizardProps) {
  const [step, setStep] = useState(1)
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [contractData, setContractData] = useState<Record<string, any>>({})
  const [buyerEmail, setBuyerEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [buyers, setBuyers] = useState<any[]>([])

  useEffect(() => {
    fetchTemplates()
    fetchBuyers()
  }, [])

  const fetchTemplates = async () => {
    try {
      console.log("[v0] Fetching contract templates...")
      const response = await fetch("/api/contracts/templates")
      const data = await response.json()
      console.log("[v0] Templates response:", data)
      setTemplates(data.templates || [])
    } catch (error) {
      console.error("[v0] Error fetching templates:", error)
    }
  }

  const fetchBuyers = async () => {
    try {
      console.log("[v0] Fetching buyers...")
      const response = await fetch("/api/users/buyers")
      const data = await response.json()
      console.log("[v0] Buyers response:", data)
      setBuyers(data.buyers || [])
    } catch (error) {
      console.error("[v0] Error fetching buyers:", error)
    }
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setContractData((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!selectedTemplate) return

    setLoading(true)
    try {
      console.log("[v0] Creating contract with data:", {
        template_id: selectedTemplate.id,
        buyer_id: contractData.buyer_id,
        contract_data: contractData,
      })

      const response = await fetch("/api/contracts/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          buyer_id: contractData.buyer_id,
          contract_data: contractData,
        }),
      })

      const data = await response.json()
      console.log("[v0] Contract creation response:", data)

      if (data.draft) {
        onComplete(data.draft.id)
      } else if (data.error) {
        console.error("[v0] Contract creation error:", data.error)
        alert(`Error creating contract: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Error creating contract:", error)
      alert("Failed to create contract. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderField = (fieldName: string, fieldConfig: any) => {
    const value = contractData[fieldName] || ""

    switch (fieldConfig.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={fieldConfig.label}
            required={fieldConfig.required}
          />
        )
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, Number.parseFloat(e.target.value) || 0)}
            placeholder={fieldConfig.label}
            min={fieldConfig.min}
            required={fieldConfig.required}
          />
        )
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            required={fieldConfig.required}
          />
        )
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={fieldConfig.label}
            required={fieldConfig.required}
            rows={3}
          />
        )
      case "select":
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(fieldName, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${fieldConfig.label}`} />
            </SelectTrigger>
            <SelectContent>
              {fieldConfig.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return null
    }
  }

  const steps = [
    { number: 1, title: "Choose Template", icon: FileText },
    { number: 2, title: "Select Buyer", icon: Users },
    { number: 3, title: "Contract Details", icon: Signature },
    { number: 4, title: "Review & Create", icon: CheckCircle },
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((stepItem, index) => (
          <div key={stepItem.number} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= stepItem.number ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              <stepItem.icon className="w-5 h-5" />
            </div>
            <span
              className={`ml-2 text-sm font-medium ${step >= stepItem.number ? "text-green-600" : "text-gray-500"}`}
            >
              {stepItem.title}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${step > stepItem.number ? "bg-green-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Choose Contract Template"}
            {step === 2 && "Select Buyer"}
            {step === 3 && "Fill Contract Details"}
            {step === 4 && "Review Contract"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Template Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No contract templates available.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Please run the database scripts to create default templates.
                  </p>
                </div>
              ) : (
                templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id ? "ring-2 ring-green-500" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.keys(template.template_fields)
                          .slice(0, 3)
                          .map((field) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {template.template_fields[field].label}
                            </Badge>
                          ))}
                        {Object.keys(template.template_fields).length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{Object.keys(template.template_fields).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Step 2: Buyer Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="buyer">Select Buyer</Label>
                <Select value={contractData.buyer_id} onValueChange={(val) => handleFieldChange("buyer_id", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyers.map((buyer) => (
                      <SelectItem key={buyer.id} value={buyer.id}>
                        {buyer.full_name} {buyer.company_name && `(${buyer.company_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Contract Details */}
          {step === 3 && selectedTemplate && (
            <div className="space-y-4">
              {Object.entries(selectedTemplate.template_fields).map(([fieldName, fieldConfig]) => (
                <div key={fieldName}>
                  <Label htmlFor={fieldName}>
                    {fieldConfig.label}
                    {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderField(fieldName, fieldConfig)}
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && selectedTemplate && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Contract Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Template:</span> {selectedTemplate.name}
                  </div>
                  <div>
                    <span className="font-medium">Buyer:</span>{" "}
                    {buyers.find((b) => b.id === contractData.buyer_id)?.full_name}
                  </div>
                  {Object.entries(contractData).map(([key, value]) => {
                    if (key === "buyer_id") return null
                    const fieldConfig = selectedTemplate.template_fields[key]
                    return (
                      <div key={key}>
                        <span className="font-medium">{fieldConfig?.label}:</span> {String(value)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Previous
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={(step === 1 && !selectedTemplate) || (step === 2 && !contractData.buyer_id)}
                >
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Contract
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
