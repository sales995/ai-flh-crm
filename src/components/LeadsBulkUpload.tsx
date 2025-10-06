import { BulkUploadDialog } from './BulkUploadDialog';
import { validateLeads } from '@/lib/uploadValidators';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeadsBulkUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const templateData = [
  {
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
    location: 'Mumbai',
    budget_min: 5000000,
    budget_max: 7000000,
    project_type: 'residential',
    source: 'website',
    status: 'new',
    notes: 'Interested in 3BHK',
    consent: true,
    tags: 'urgent,premium',
  },
];

export function LeadsBulkUpload({ open, onOpenChange, onSuccess }: LeadsBulkUploadProps) {
  const { toast } = useToast();

  const handleUpload = async (data: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const leadsWithCreatedBy = data.map(lead => ({
      ...lead,
      created_by: user.id,
    }));

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < leadsWithCreatedBy.length; i += batchSize) {
      const batch = leadsWithCreatedBy.slice(i, i + batchSize);
      
      const { data: inserted, error } = await supabase
        .from('leads')
        .insert(batch)
        .select();

      if (error) {
        results.failed += batch.length;
        results.errors.push({
          rows: `${i + 1}-${i + batch.length}`,
          error: error.message,
        });
      } else {
        results.success += inserted?.length || 0;
      }
    }

    if (results.success > 0) {
      toast({
        title: 'Upload Complete',
        description: `${results.success} leads uploaded successfully`,
      });
      onSuccess();
    }

    if (results.failed > 0) {
      toast({
        title: 'Partial Upload',
        description: `${results.failed} leads failed to upload`,
        variant: 'destructive',
      });
    }

    return results;
  };

  return (
    <BulkUploadDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Upload Leads"
      description="Upload multiple leads at once using a CSV or Excel file. Download the template to see the required format."
      templateData={templateData}
      templateFilename="leads_template.csv"
      onUpload={handleUpload}
      validateData={validateLeads}
    />
  );
}
