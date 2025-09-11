"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface Profile {
  id: string
  full_name: string | null
  user_type: string | null
  phone: string | null
  location: string | null
  farm_size: number | null
  specialization: string[] | null
}

interface ProfileEditFormProps {
  profile: Profile
  onProfileUpdate: (updatedProfile: Profile) => void
  onCancel: () => void
}

export function ProfileEditForm({ profile, onProfileUpdate, onCancel }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    phone: profile.phone || "",
    location: profile.location || "",
    farm_size: profile.farm_size?.toString() || "",
    specialization: profile.specialization?.join(", ") || "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("Submitting profile update:", formData)
      
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          farm_size: formData.farm_size ? Number.parseFloat(formData.farm_size) : null,
          specialization: formData.specialization
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      })

      console.log("Profile update response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Profile update failed:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to update profile")
      }

      const { data } = await response.json()
      console.log("Profile updated successfully:", data)
      
      onProfileUpdate(data)
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>Update your profile information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Enter your location"
            />
          </div>

          {profile.user_type === "farmer" && (
            <>
              <div>
                <Label htmlFor="farm_size">Farm Size (acres)</Label>
                <Input
                  id="farm_size"
                  type="number"
                  step="0.1"
                  value={formData.farm_size}
                  onChange={(e) => handleChange("farm_size", e.target.value)}
                  placeholder="e.g., 10.5"
                />
              </div>
              <div>
                <Label htmlFor="specialization">Crops Grown</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleChange("specialization", e.target.value)}
                  placeholder="e.g., Rice, Wheat, Corn (comma separated)"
                />
              </div>
            </>
          )}

          {profile.user_type === "buyer" && (
            <>
              <div>
                <Label htmlFor="specialization">Industry Focus</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleChange("specialization", e.target.value)}
                  placeholder="e.g., Food Processing, Export, Retail (comma separated)"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
