import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, Users, MessageSquare, FileText, Shield, 
  Trash2, RefreshCw, Search, DollarSign, Package,
  Check, X, TrendingUp, Settings, Flag, Star, Eye
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import romanLogo from '@/assets/roman-logo.png';

interface AdminPanelProps {
  onBack: () => void;
}

interface UserData {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean | null;
  created_at: string;
}

interface PostData {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: { username: string } | null;
}

interface ListingData {
  id: string;
  title: string;
  price: number;
  status: string;
  user_id: string;
  created_at: string;
  category: string;
}

interface AdminRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface MonetizationApplication {
  id: string;
  user_id: string;
  status: string;
  applied_at: string;
  approved_at: string | null;
  earnings_total: number | null;
  earnings_pending: number | null;
}

interface ReportData {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  listing?: { title: string } | null;
}

interface RatingData {
  id: string;
  seller_id: string;
  rater_id: string;
  listing_id: string | null;
  rating: number;
  review: string | null;
  created_at: string;
}

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdminCheck();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [admins, setAdmins] = useState<AdminRole[]>([]);
  const [monetizationApps, setMonetizationApps] = useState<MonetizationApplication[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [ratings, setRatings] = useState<RatingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalListings: 0,
    pendingListings: 0,
    totalRevenue: 0,
    totalAdmins: 0,
    pendingMonetization: 0,
    pendingReports: 0,
    totalRatings: 0,
  });
  const [platformFee, setPlatformFee] = useState(10);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profile:profiles!posts_user_id_fkey(username)')
        .order('created_at', { ascending: false });

      const { data: listingsData } = await supabase
        .from('marketplace_listings')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: adminsData } = await supabase
        .from('admin_roles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: monetizationData } = await supabase
        .from('monetization_applications')
        .select('*')
        .order('applied_at', { ascending: false });

      const { data: reportsData } = await supabase
        .from('listing_reports')
        .select('*, listing:marketplace_listings(title)')
        .order('created_at', { ascending: false });

      const { data: ratingsData } = await supabase
        .from('seller_ratings')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: feeData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_fee_percentage')
        .single();

      if (feeData) {
        setPlatformFee((feeData.setting_value as any)?.value || 10);
      }

      setUsers(usersData || []);
      setPosts(postsData || []);
      setListings(listingsData || []);
      setAdmins(adminsData || []);
      setMonetizationApps(monetizationData || []);
      setReports(reportsData || []);
      setRatings(ratingsData || []);

      const pendingCount = listingsData?.filter(l => l.status === 'pending').length || 0;
      const pendingMonetizationCount = monetizationData?.filter(m => m.status === 'pending').length || 0;
      const pendingReportsCount = reportsData?.filter(r => r.status === 'pending').length || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        totalPosts: postsData?.length || 0,
        totalListings: listingsData?.length || 0,
        pendingListings: pendingCount,
        totalRevenue: 0,
        totalAdmins: adminsData?.length || 0,
        pendingMonetization: pendingMonetizationCount,
        pendingReports: pendingReportsCount,
        totalRatings: ratingsData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      toast.success('Post deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleListingStatus = async (listingId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ status })
        .eq('id', listingId);
      if (error) throw error;
      toast.success(`Listing ${status}`);
      fetchData();
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    }
  };

  const handleAddAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.from('admin_roles').insert({ user_id: userId, role: 'admin' });
      if (error) throw error;
      toast.success('Admin role added');
      fetchData();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase.from('admin_roles').delete().eq('id', adminId);
      if (error) throw error;
      toast.success('Admin role removed');
      fetchData();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  const handleUpdateFee = async () => {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ setting_value: { value: platformFee } })
        .eq('setting_key', 'platform_fee_percentage');
      if (error) throw error;
      toast.success('Platform fee updated');
    } catch (error) {
      console.error('Error updating fee:', error);
      toast.error('Failed to update fee');
    }
  };

  const handleMonetizationStatus = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      const updateData: { status: string; approved_at?: string } = { status };
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('monetization_applications')
        .update(updateData)
        .eq('id', appId);
      
      if (error) throw error;
      toast.success(`Monetization application ${status}`);
      fetchData();
    } catch (error) {
      console.error('Error updating monetization status:', error);
      toast.error('Failed to update application');
    }
  };

  const handleReportStatus = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('listing_reports')
        .update({ status })
        .eq('id', reportId);
      
      if (error) throw error;
      toast.success(`Report ${status}`);
      fetchData();
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report');
    }
  };

  const handleDeleteRating = async (ratingId: string) => {
    try {
      const { error } = await supabase
        .from('seller_ratings')
        .delete()
        .eq('id', ratingId);
      
      if (error) throw error;
      toast.success('Rating deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting rating:', error);
      toast.error('Failed to delete rating');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .delete()
        .eq('id', listingId);
      
      if (error) throw error;
      toast.success('Listing deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">You don't have permission to access this panel.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={romanLogo} alt="Roman" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
            {isSuperAdmin && <Badge variant="default">Super Admin</Badge>}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalPosts}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalListings}</p>
              <p className="text-xs text-muted-foreground">Listings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.pendingListings}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">${stats.totalRevenue}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalAdmins}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="listings" className="p-4">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap">
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <Flag className="w-4 h-4" />
            Reports
            {stats.pendingReports > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{stats.pendingReports}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            Ratings ({stats.totalRatings})
          </TabsTrigger>
          <TabsTrigger value="monetization" className="flex items-center gap-1">
            Monetization
            {stats.pendingMonetization > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{stats.pendingMonetization}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="space-y-4">
          <h3 className="text-lg font-semibold">Pending Approvals</h3>
          {listings.filter(l => l.status === 'pending').length === 0 ? (
            <p className="text-muted-foreground">No pending listings</p>
          ) : (
            <div className="space-y-2">
              {listings.filter(l => l.status === 'pending').map((listing) => (
                <Card key={listing.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{listing.title}</h4>
                      <p className="text-sm text-muted-foreground">${listing.price} • {listing.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleListingStatus(listing.id, 'approved')}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleListingStatus(listing.id, 'rejected')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <h3 className="text-lg font-semibold mt-6">All Listings</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.title}</TableCell>
                    <TableCell>${listing.price}</TableCell>
                    <TableCell>{listing.category}</TableCell>
                    <TableCell>
                      <Badge variant={listing.status === 'approved' ? 'default' : listing.status === 'pending' ? 'secondary' : 'destructive'}>
                        {listing.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {listing.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600 h-8 w-8 p-0" onClick={() => handleListingStatus(listing.id, 'approved')}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600 h-8 w-8 p-0" onClick={() => handleListingStatus(listing.id, 'rejected')}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteListing(listing.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-500" />
            Pending Reports
          </h3>
          {reports.filter(r => r.status === 'pending').length === 0 ? (
            <p className="text-muted-foreground">No pending reports</p>
          ) : (
            <div className="space-y-2">
              {reports.filter(r => r.status === 'pending').map((report) => {
                const reporter = users.find(u => u.user_id === report.reporter_id);
                return (
                  <Card key={report.id} className="border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-orange-600 border-orange-600">{report.reason}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-medium">Listing: {report.listing?.title || 'Unknown'}</p>
                          {report.description && (
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Reported by: @{reporter?.username || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleReportStatus(report.id, 'reviewed')}>
                            <Eye className="w-4 h-4 mr-1" /> Review
                          </Button>
                          <Button size="sm" variant="outline" className="text-muted-foreground" onClick={() => handleReportStatus(report.id, 'dismissed')}>
                            <X className="w-4 h-4 mr-1" /> Dismiss
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <h3 className="text-lg font-semibold mt-6">All Reports</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const reporter = users.find(u => u.user_id === report.reporter_id);
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.listing?.title || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.reason}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{report.description || '-'}</TableCell>
                      <TableCell>@{reporter?.username || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'pending' ? 'secondary' : report.status === 'reviewed' ? 'default' : 'outline'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(report.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {report.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => handleReportStatus(report.id, 'reviewed')}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleReportStatus(report.id, 'dismissed')}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Ratings Tab */}
        <TabsContent value="ratings" className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            All Ratings & Reviews ({ratings.length})
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Rater</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratings.map((rating) => {
                  const seller = users.find(u => u.user_id === rating.seller_id);
                  const rater = users.find(u => u.user_id === rating.rater_id);
                  return (
                    <TableRow key={rating.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={seller?.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{seller?.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>@{seller?.username || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={rater?.avatar_url || ''} />
                            <AvatarFallback className="text-xs">{rater?.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>@{rater?.username || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < rating.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} 
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{rating.review || '-'}</TableCell>
                      <TableCell className="text-xs">{new Date(rating.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteRating(rating.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="monetization" className="space-y-4">
          <h3 className="text-lg font-semibold">Pending Monetization Applications</h3>
          {monetizationApps.filter(app => app.status === 'pending').length === 0 ? (
            <p className="text-muted-foreground">No pending applications</p>
          ) : (
            <div className="space-y-2">
              {monetizationApps.filter(app => app.status === 'pending').map((app) => {
                const appUser = users.find(u => u.user_id === app.user_id);
                return (
                  <Card key={app.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={appUser?.avatar_url || ''} />
                          <AvatarFallback>{appUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{appUser?.username || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            UID: {app.user_id.slice(0, 8)}... • Applied: {new Date(app.applied_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleMonetizationStatus(app.id, 'approved')}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleMonetizationStatus(app.id, 'rejected')}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <h3 className="text-lg font-semibold mt-6">All Applications</h3>
          <div className="space-y-2">
            {monetizationApps.map((app) => {
              const appUser = users.find(u => u.user_id === app.user_id);
              return (
                <Card key={app.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={appUser?.avatar_url || ''} />
                        <AvatarFallback>{appUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{appUser?.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          UID: {app.user_id.slice(0, 8)}... • {app.approved_at ? `Approved: ${new Date(app.approved_at).toLocaleDateString()}` : `Applied: ${new Date(app.applied_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={app.status === 'approved' ? 'default' : app.status === 'pending' ? 'secondary' : 'destructive'}>
                        {app.status}
                      </Badge>
                      {app.status !== 'approved' && app.status !== 'rejected' && (
                        <>
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleMonetizationStatus(app.id, 'approved')}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleMonetizationStatus(app.id, 'rejected')}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <Card key={u.user_id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={u.avatar_url || ''} />
                      <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-sm text-muted-foreground">{u.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.is_online ? 'default' : 'secondary'}>{u.is_online ? 'Online' : 'Offline'}</Badge>
                    {isSuperAdmin && !admins.find(a => a.user_id === u.user_id) && (
                      <Button size="sm" variant="outline" onClick={() => handleAddAdmin(u.user_id)}>Make Admin</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="space-y-2">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">@{post.profile?.username}</p>
                  <p className="line-clamp-2">{post.content}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => handleDeletePost(post.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="admins" className="space-y-2">
          {admins.map((admin) => {
            const adminUser = users.find(u => u.user_id === admin.user_id);
            return (
              <Card key={admin.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={adminUser?.avatar_url || ''} />
                      <AvatarFallback>{adminUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{adminUser?.username}</p>
                      <Badge variant="outline">{admin.role}</Badge>
                    </div>
                  </div>
                  {isSuperAdmin && admin.role !== 'super_admin' && (
                    <Button size="sm" variant="destructive" onClick={() => handleRemoveAdmin(admin.id)}>Remove</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Monetization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Platform Fee (%)</label>
                <div className="flex gap-2 mt-1">
                  <Input type="number" value={platformFee} onChange={(e) => setPlatformFee(Number(e.target.value))} min="0" max="100" className="w-32" />
                  <Button onClick={handleUpdateFee}>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Fee charged on each marketplace transaction</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
