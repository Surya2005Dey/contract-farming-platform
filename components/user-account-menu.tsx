'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Settings, 
  LogOut, 
  CreditCard, 
  HelpCircle,
  Bell,
  UserCircle
} from "lucide-react"

interface UserAccountMenuProps {
  user: any
  profile: any
  onSignOut: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
}

export function UserAccountMenu({ 
  user, 
  profile, 
  onSignOut, 
  onProfileClick,
  onSettingsClick 
}: UserAccountMenuProps) {
  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U'
  }

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'farmer':
        return 'bg-green-100 text-green-800'
      case 'buyer':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={profile?.avatar_url} 
              alt={profile?.full_name || 'User'} 
            />
            <AvatarFallback className="bg-green-600 text-white">
              {getInitials(profile?.full_name || user?.email || 'User')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={profile?.avatar_url} 
                  alt={profile?.full_name || 'User'} 
                />
                <AvatarFallback className="bg-green-600 text-white text-xs">
                  {getInitials(profile?.full_name || user?.email || 'User')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            {profile?.user_type && (
              <Badge 
                variant="secondary" 
                className={`w-fit ${getUserTypeColor(profile.user_type)}`}
              >
                {profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1)}
              </Badge>
            )}
            {profile?.company_name && (
              <p className="text-xs text-gray-500">
                {profile.company_name}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
          <UserCircle className="mr-2 h-4 w-4" />
          <span>View Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onSettingsClick} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer">
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer">
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing & Payments</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer">
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help & Support</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onSignOut} 
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}