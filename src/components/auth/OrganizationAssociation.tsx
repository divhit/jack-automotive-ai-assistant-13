import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth, Organization } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OrganizationAssociationProps {
  onAssociationComplete?: () => void;
}

export const OrganizationAssociation: React.FC<OrganizationAssociationProps> = ({ 
  onAssociationComplete 
}) => {
  const { getAvailableOrganizations, associateWithOrganization, user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [associating, setAssociating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getAvailableOrganizations();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data && data.length > 0) {
        setOrganizations(data);
        // Auto-select if there's only one organization
        if (data.length === 1) {
          setSelectedOrgId(data[0].id);
        }
      } else {
        setError('No organizations found. Please contact support to create an organization first.');
      }
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleAssociate = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }

    setAssociating(true);
    setError(null);

    try {
      const { error } = await associateWithOrganization(selectedOrgId);
      
      if (error) {
        setError(error.message);
        return;
      }

      toast.success('Successfully associated with organization!');
      onAssociationComplete?.();
    } catch (err) {
      setError('Failed to associate with organization');
    } finally {
      setAssociating(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading organizations...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Organization Setup Required
        </CardTitle>
        <CardDescription>
          Your account needs to be associated with an organization to access the system.
          {user?.email && ` (${user.email})`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {organizations.length > 0 ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select your organization:</label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAssociate} 
              disabled={!selectedOrgId || associating}
              className="w-full"
            >
              {associating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Associating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Associate with Organization
                </>
              )}
            </Button>

            {organizations.length === 1 && (
              <Alert>
                <AlertDescription>
                  Only one organization is available. Click the button above to join it.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No organizations are available. Please contact your administrator to set up an organization first.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          Once associated, you'll have access to the full system including lead management and telephony features.
        </div>
      </CardContent>
    </Card>
  );
}; 