import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, Wallet, Users, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MonetizationViewProps {
  onBack: () => void;
}

interface MonetizationApplication {
  id: string;
  user_id: string;
  status: string;
  applied_at: string;
  approved_at: string | null;
  earnings_total: number | null;
  earnings_pending: number | null;
  payout_method: string | null;
  payout_details: unknown;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const MonetizationView = ({ onBack }: MonetizationViewProps) => {
  const { user } = useAuth();
  const [myApplication, setMyApplication] = useState<MonetizationApplication | null>(null);
  const [allApplications, setAllApplications] = useState<MonetizationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutEmail, setPayoutEmail] = useState('');

  useEffect(() => {
    fetchApplications();

    // Realtime subscription
    const channel = supabase
      .channel('monetization-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monetization_applications'
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchApplications = async () => {
    try {
      // Fetch all applications with profiles
      const { data: applications, error } = await supabase
        .from('monetization_applications')
        .select('*')
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for all applicants
      if (applications && applications.length > 0) {
        const userIds = applications.map(app => app.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', userIds);

        const applicationsWithProfiles = applications.map(app => ({
          ...app,
          profile: profiles?.find(p => p.user_id === app.user_id)
        }));

        setAllApplications(applicationsWithProfiles);

        // Find current user's application
        if (user) {
          const myApp = applicationsWithProfiles.find(app => app.user_id === user.id);
          setMyApplication(myApp || null);
          if (myApp?.payout_method) {
            setPayoutMethod(myApp.payout_method);
          }
        }
      } else {
        setAllApplications([]);
        setMyApplication(null);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error('Please login to apply for monetization');
      return;
    }

    // Check if session is valid before attempting
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      toast.error('Session expired. Please login again.');
      await supabase.auth.signOut();
      return;
    }

    setApplying(true);
    try {
      const { error } = await supabase
        .from('monetization_applications')
        .insert({
          user_id: user.id,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already applied for monetization');
        } else if (error.message?.includes('JWT') || error.message?.includes('token')) {
          toast.error('Session expired. Please login again.');
          await supabase.auth.signOut();
        } else {
          throw error;
        }
      } else {
        toast.success('Monetization application submitted!');
        fetchApplications();
      }
    } catch (error: any) {
      console.error('Error applying:', error);
      if (error?.message?.includes('JWT') || error?.message?.includes('token') || error?.code === 'PGRST301') {
        toast.error('Session expired. Please login again.');
        await supabase.auth.signOut();
      } else {
        toast.error('Failed to submit application');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleSavePayoutSettings = async () => {
    if (!myApplication) return;

    try {
      const { error } = await supabase
        .from('monetization_applications')
        .update({
          payout_method: payoutMethod,
          payout_details: { email: payoutEmail },
          updated_at: new Date().toISOString()
        })
        .eq('id', myApplication.id);

      if (error) throw error;
      toast.success('Payout settings saved!');
      fetchApplications();
    } catch (error) {
      console.error('Error saving payout settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <DollarSign className="h-6 w-6 text-green-500" />
        <h1 className="text-xl font-bold">Monetization</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Apply Section - Only show if not applied */}
        {!myApplication && (
          <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-bold mb-2">Start Earning</h2>
              <p className="text-muted-foreground mb-4">
                Apply for monetization to start earning from your content
              </p>
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={handleApply}
                disabled={applying || !user}
              >
                {applying ? 'Applying...' : 'Apply for Monetize'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dashboard - Show if applied */}
        {myApplication && (
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="payout">Payout</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4 mt-4">
              {/* Status Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Application Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(myApplication.status)}
                    <span className="text-sm text-muted-foreground">
                      Applied: {formatDate(myApplication.applied_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Total Earnings</span>
                    </div>
                    <p className="text-2xl font-bold text-green-500">
                      ${myApplication.earnings_total?.toFixed(2) || '0.00'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-500">
                      ${myApplication.earnings_pending?.toFixed(2) || '0.00'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="earnings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No earnings data yet</p>
                    <p className="text-sm">Start creating content to earn</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payout" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payout Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payout Method</Label>
                    <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payout method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Email</Label>
                    <Input 
                      placeholder="Enter your payment email"
                      value={payoutEmail}
                      onChange={(e) => setPayoutEmail(e.target.value)}
                    />
                  </div>

                  <Button 
                    className="w-full"
                    onClick={handleSavePayoutSettings}
                    disabled={!payoutMethod}
                  >
                    Save Payout Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Separator />

        {/* Public Monetize Received Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Monetize Received ({allApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : allApplications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No monetization applications yet</p>
                <p className="text-sm">Be the first to apply!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allApplications.map((app) => (
                  <div 
                    key={app.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={app.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {app.profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {app.profile?.full_name || app.profile?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        UID: {app.user_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(app.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(app.applied_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
