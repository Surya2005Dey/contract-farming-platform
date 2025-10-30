'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { useRealtimeContracts } from '@/hooks/use-realtime-contracts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Search,
  Filter,
  Eye,
  Edit,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const CONTRACT_STATUS_CONFIG = {
  draft: { 
    icon: FileText, 
    color: 'text-gray-500', 
    bgColor: 'bg-gray-100', 
    label: 'Draft' 
  },
  open: { 
    icon: Clock, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-100', 
    label: 'Open for Bids' 
  },
  active: { 
    icon: CheckCircle, 
    color: 'text-green-500', 
    bgColor: 'bg-green-100', 
    label: 'Active' 
  },
  completed: { 
    icon: CheckCircle, 
    color: 'text-emerald-500', 
    bgColor: 'bg-emerald-100', 
    label: 'Completed' 
  },
  cancelled: { 
    icon: XCircle, 
    color: 'text-red-500', 
    bgColor: 'bg-red-100', 
    label: 'Cancelled' 
  },
}

interface Contract {
  id: string
  farmer_id: string
  buyer_id: string
  crop_type: string
  quantity: number
  price_per_unit: number
  total_amount: number
  delivery_date: string
  status: string
  created_at: string
  updated_at: string
  farmer: {
    id: string
    full_name: string
    user_type: string
    location: string
  }
  buyer: {
    id: string
    full_name: string
    user_type: string
    company_name: string
  }
}

export function ContractManager() {
  const { user } = useUser()
  const { contracts, loading } = useRealtimeContracts({ user })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('all')

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.crop_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.farmer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.buyer.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'my-contracts' && contract.farmer_id === user?.id) ||
      (activeTab === 'my-bids' && contract.buyer_id === user?.id)
    
    return matchesSearch && matchesStatus && matchesTab
  })

  const contractsByStatus = {
    draft: filteredContracts.filter(c => c.status === 'draft'),
    open: filteredContracts.filter(c => c.status === 'open'),
    active: filteredContracts.filter(c => c.status === 'active'),
    completed: filteredContracts.filter(c => c.status === 'completed'),
    cancelled: filteredContracts.filter(c => c.status === 'cancelled'),
  }

  const ContractCard = ({ contract }: { contract: Contract }) => {
    const statusConfig = CONTRACT_STATUS_CONFIG[contract.status as keyof typeof CONTRACT_STATUS_CONFIG]
    const StatusIcon = statusConfig?.icon || AlertCircle
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{contract.crop_type} Contract</CardTitle>
              <CardDescription className="flex items-center space-x-2">
                <span>{contract.crop_type}</span>
                <span>•</span>
                <span>{contract.quantity} units</span>
                <span>•</span>
                <span>${contract.price_per_unit}/unit</span>
              </CardDescription>
            </div>
            <Badge variant="secondary" className={cn("flex items-center space-x-1", statusConfig?.bgColor)}>
              <StatusIcon className={cn("h-3 w-3", statusConfig?.color)} />
              <span>{statusConfig?.label || contract.status}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <div>Delivery Date: {new Date(contract.delivery_date).toLocaleDateString()}</div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Farmer:</span>
                <span>{contract.farmer?.full_name || 'Unknown'}</span>
              </div>
              {contract.buyer && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Buyer:</span>
                  <span>{contract.buyer.full_name}</span>
                </div>
              )}
            </div>
            <div className="text-right space-y-1">
              <div className="font-medium text-lg">
                ${contract.total_amount.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(contract.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            {contract.farmer_id === user?.id && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {contract.status === 'open' && contract.farmer_id !== user?.id && (
              <Button size="sm">
                <DollarSign className="h-4 w-4 mr-1" />
                Bid
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 animate-pulse" />
          <span>Loading contracts...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contract Management</h2>
          <p className="text-muted-foreground">
            {contracts.length} contract{contracts.length === 1 ? '' : 's'} total
          </p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Create Contract
        </Button>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="open">Open for Bids</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Contracts</TabsTrigger>
          <TabsTrigger value="my-contracts">My Contracts</TabsTrigger>
          <TabsTrigger value="my-bids">My Bids</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredContracts.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by creating your first contract.'
                }
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredContracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(contractsByStatus).map(([status, contracts]) => {
              const config = CONTRACT_STATUS_CONFIG[status as keyof typeof CONTRACT_STATUS_CONFIG]
              const StatusIcon = config?.icon || AlertCircle
              
              return (
                <div key={status} className="text-center space-y-2">
                  <div className={cn("w-12 h-12 mx-auto rounded-lg flex items-center justify-center", config?.bgColor)}>
                    <StatusIcon className={cn("h-6 w-6", config?.color)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{contracts.length}</div>
                    <div className="text-sm text-muted-foreground">{config?.label || status}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}