import { useState, useEffect } from 'react';
import { EnhancedBulkUploadDialog } from './EnhancedBulkUploadDialog';
import { validateLeads } from '@/lib/uploadValidators';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface LeadsBulkUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const templateData = [
  {
    name: 'John Doe',
    phone: '9876543210',
    email: 'john@example.com',
    source: 'website',
  },
  {
    name: 'Jane Smith',
    phone: '+919123456789',
    email: '',
    source: 'meta',
  },
];

export function LeadsBulkUpload({ open, onOpenChange, onSuccess }: LeadsBulkUploadProps) {
  const { toast } = useToast();
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [proceedToUpload, setProceedToUpload] = useState(false);

  // Sync with parent's open prop
  useEffect(() => {
    if (open) {
      setShowGuidelines(true);
      setProceedToUpload(false);
    } else {
      setShowGuidelines(false);
      setProceedToUpload(false);
    }
  }, [open]);

  const handleCloseAll = () => {
    setShowGuidelines(false);
    setProceedToUpload(false);
    onOpenChange(false);
  };

  const handleProceedWithUpload = () => {
    setShowGuidelines(false);
    setProceedToUpload(true);
  };

  const handleUpload = async (data: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as any[],
    };

    // Check for duplicates in database
    const phones = data.map(lead => lead.core.phone);
    const emails = data.filter(lead => lead.core.email).map(lead => lead.core.email);

    const { data: existingLeads } = await supabase
      .from('leads')
      .select('phone, email')
      .or(`phone.in.(${phones.join(',')}),email.in.(${emails.join(',')})`);

    const existingPhones = new Set(existingLeads?.map(l => l.phone) || []);
    const existingEmails = new Set(existingLeads?.map(l => l.email).filter(Boolean) || []);

    // Mark duplicates but still insert them
    const leadsToInsert = data.map((lead) => {
      const isDuplicate = 
        existingPhones.has(lead.core.phone) || 
        (lead.core.email && existingEmails.has(lead.core.email));
      
      if (isDuplicate) {
        results.duplicates++;
      }

      return {
        core: {
          ...lead.core,
          lead_type: isDuplicate ? 'duplicate' : 'fresh',
          created_by: user.id,
        },
        details: lead.details,
      };
    });

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < leadsToInsert.length; i += batchSize) {
      const batch = leadsToInsert.slice(i, i + batchSize);
      
      // Insert core lead data
      const { data: insertedLeads, error: leadsError } = await supabase
        .from('leads')
        .insert(batch.map(l => l.core))
        .select();

      if (leadsError) {
        results.failed += batch.length;
        results.errors.push({
          rows: `${i + 1}-${i + batch.length}`,
          error: leadsError.message,
        });
        continue;
      }

      // Insert lead_details if optional fields exist
      if (insertedLeads) {
        const detailsToInsert = insertedLeads
          .map((lead, idx) => {
            const details = batch[idx].details;
            if (!details || Object.keys(details).length === 0) return null;
            
            return {
              lead_id: lead.id,
              ...details,
            };
          })
          .filter(Boolean);

        if (detailsToInsert.length > 0) {
          const { error: detailsError } = await supabase
            .from('lead_details')
            .insert(detailsToInsert);

          if (detailsError) {
            console.error('Error inserting lead details:', detailsError);
          }
        }

        results.success += insertedLeads.length;
      }
    }

    if (results.success > 0) {
      const message = `${results.success} leads uploaded successfully${results.duplicates > 0 ? ` (${results.duplicates} marked as duplicates)` : ''}`;
      toast({
        title: 'Upload Complete',
        description: message,
      });
      onSuccess();
    }

    if (results.failed > 0 && results.success === 0) {
      toast({
        title: 'Upload Failed',
        description: `${results.failed} leads failed`,
        variant: 'destructive',
      });
    }

    return results;
  };

  return (
    <>
      {/* Pre-Upload Guidelines Alert */}
      <AlertDialog open={showGuidelines} onOpenChange={setShowGuidelines}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Bulk Upload Guidelines</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-semibold text-green-700 dark:text-green-400">✅ Accepted Columns:</p>
                  <p className="text-sm mt-1">
                    <strong>Required:</strong> Name, Mobile, Email, Source
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Optional:</strong> Preferred Location, Radius, Property Type, BHK, Size, Facing, 
                    Budget Min, Budget Max, Additional Requirements, Purchase Intent, Buying For, ROI Months
                  </p>
                </div>
                <div className="border-l-4 border-red-500 pl-4 py-2">
                  <p className="font-semibold text-red-700 dark:text-red-400">🟥 Important Notes:</p>
                  <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                    <li>Any unknown columns will cause upload rejection</li>
                    <li>Duplicates will be automatically tagged but still imported</li>
                    <li>All imported leads will have Status = New</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> Please double-check your file format and spelling before uploading.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedWithUpload}>
              Upload File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Upload Dialog */}
      <EnhancedBulkUploadDialog
        open={proceedToUpload}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseAll();
          }
        }}
        title="Bulk Upload Leads"
        description="Upload multiple leads with core fields and optional assessment details. Unknown columns will be rejected."
        templateData={templateData}
        templateFilename="leads_template.csv"
        onUpload={handleUpload}
        validateData={validateLeads}
        requiredColumns={['name', 'phone', 'email', 'source']}
        optionalColumns={[
          'preferred_location',
          'radius',
          'property_type',
          'bhk',
          'size_min',
          'size_max',
          'facing',
          'budget_min_detail',
          'budget_max_detail',
          'additional_requirements',
          'purchase_intent',
          'buying_for',
          'roi_months',
        ]}
      />
    </>
  );
}
