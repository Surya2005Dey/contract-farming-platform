'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  DollarSign, 
  MapPin,
  Search,
  MessageSquare,
  Upload,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

interface AnalyticsData {
  overview?: any
  contracts?: any
  users?: any
  revenue?: any
  engagement?: any
  geography?: any
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  description?: string
}

const MetricCard = ({ title, value, change, icon, description }: MetricCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change !== undefined && (
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          {change > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : change < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-500" />
          ) : null}
          <span className={change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : ''}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span>from last period</span>
        </div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
)

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>({})
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe])

  const fetchAnalytics = async () => {
    setLoading(true)
    
    try {
      const endpoints = [
        'overview',
        'contracts', 
        'users',
        'revenue',
        'engagement',
        'geography'
      ]

      const responses = await Promise.all(
        endpoints.map(endpoint => 
          fetch(`/api/analytics?metric=${endpoint}&timeframe=${timeframe}`)
        )
      )

      const results = await Promise.all(
        responses.map(response => response.json())
      )

      const analyticsData: AnalyticsData = {}
      endpoints.forEach((endpoint, index) => {
        if (results[index].success) {
          analyticsData[endpoint as keyof AnalyticsData] = results[index].data
        }
      })

      setData(analyticsData)

    } catch (error) {
      toast({
        title: 'Analytics Error',
        description: 'Failed to fetch analytics data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Contracts"
          value={formatNumber(data.overview?.totalMetrics?.totalContracts || 0)}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          description="All contracts created"
        />
        <MetricCard
          title="Active Contracts"
          value={formatNumber(data.overview?.totalMetrics?.activeContracts || 0)}
          icon={<Activity className="h-4 w-4 text-green-500" />}
          description="Currently active contracts"
        />
        <MetricCard
          title="Total Users"
          value={formatNumber(data.overview?.totalMetrics?.totalUsers || 0)}
          icon={<Users className="h-4 w-4 text-blue-500" />}
          description="Registered users"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.overview?.recentActivity?.totalRevenue || 0)}
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
          description={`Last ${timeframe}`}
        />
      </div>

      {/* Contract Status Distribution */}
      {data.overview?.contractStatusDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Contract Status Distribution</CardTitle>
            <CardDescription>Breakdown of contract statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={Object.entries(data.overview.contractStatusDistribution).map(([status, count]) => ({
                    name: status,
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {Object.keys(data.overview.contractStatusDistribution).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const ContractsTab = () => (
    <div className="space-y-6">
      {/* Contract Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Value"
          value={formatCurrency(data.contracts?.metrics?.totalValue || 0)}
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
        />
        <MetricCard
          title="Avg Contract Value"
          value={formatCurrency(data.contracts?.metrics?.avgContractValue || 0)}
          icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
        />
        <MetricCard
          title="Completion Rate"
          value={`${(data.contracts?.metrics?.completionRate || 0).toFixed(1)}%`}
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
        />
      </div>

      {/* Contracts Over Time */}
      {data.contracts?.contractsOverTime && (
        <Card>
          <CardHeader>
            <CardTitle>Contracts Over Time</CardTitle>
            <CardDescription>Daily contract creation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.contracts.contractsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Crop Distribution */}
      {data.contracts?.cropDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Crop Type Distribution</CardTitle>
            <CardDescription>Contracts by crop type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.contracts.cropDistribution)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 10)
                .map(([crop, count]) => (
                  <div key={crop} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{crop}</span>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={(count as number / Object.values(data.contracts.cropDistribution).reduce((a: number, b) => a + (b as number), 0)) * 100} 
                        className="w-24" 
                      />
                      <span className="text-sm text-muted-foreground w-8">{count as number}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const UsersTab = () => (
    <div className="space-y-6">
      {/* User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={formatNumber(data.users?.metrics?.totalUsers || 0)}
          icon={<Users className="h-4 w-4 text-blue-500" />}
        />
        <MetricCard
          title="Active Users"
          value={formatNumber(data.users?.metrics?.activeUsers || 0)}
          icon={<Activity className="h-4 w-4 text-green-500" />}
        />
        <MetricCard
          title="Farmers"
          value={formatNumber(data.users?.metrics?.farmerCount || 0)}
          icon={<Users className="h-4 w-4 text-orange-500" />}
        />
        <MetricCard
          title="Buyers"
          value={formatNumber(data.users?.metrics?.buyerCount || 0)}
          icon={<Users className="h-4 w-4 text-purple-500" />}
        />
      </div>

      {/* User Registration Over Time */}
      {data.users?.usersOverTime && (
        <Card>
          <CardHeader>
            <CardTitle>User Registration Over Time</CardTitle>
            <CardDescription>Daily new user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.users.usersOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Locations */}
      {data.users?.locationDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Top User Locations</CardTitle>
            <CardDescription>Users by location</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {data.users.locationDistribution.map(([location, count]: [string, number]) => (
                  <div key={location} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{location}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const EngagementTab = () => (
    <div className="space-y-6">
      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Messages"
          value={formatNumber(data.engagement?.messaging?.metrics?.totalMessages || 0)}
          icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
        />
        <MetricCard
          title="Total Searches"
          value={formatNumber(data.engagement?.search?.metrics?.totalSearches || 0)}
          icon={<Search className="h-4 w-4 text-green-500" />}
        />
        <MetricCard
          title="File Uploads"
          value={formatNumber(data.engagement?.fileUploads?.metrics?.totalUploads || 0)}
          icon={<Upload className="h-4 w-4 text-orange-500" />}
        />
      </div>

      {/* Messaging Activity */}
      {data.engagement?.messaging?.messagesOverTime && (
        <Card>
          <CardHeader>
            <CardTitle>Messaging Activity</CardTitle>
            <CardDescription>Messages sent over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.engagement.messaging.messagesOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Search Analytics */}
      {data.engagement?.search?.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Searches</span>
                  <span className="font-medium">{data.engagement.search.metrics.totalSearches}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Results</span>
                  <span className="font-medium">{data.engagement.search.metrics.avgSearchResults.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Files</span>
                  <span className="font-medium">{data.engagement.fileUploads.metrics.totalUploads}</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage Used</span>
                  <span className="font-medium">{data.engagement.fileUploads.metrics.totalStorageUsed} MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Platform performance metrics and insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchAnalytics} 
            disabled={loading}
            variant="outline"
            size="icon"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          <ContractsTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <EngagementTab />
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading analytics data...</p>
        </div>
      )}
    </div>
  )
}