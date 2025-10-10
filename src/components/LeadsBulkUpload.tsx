import { EnhancedBulkUploadDialog } from './EnhancedBulkUploadDialog';
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
    <EnhancedBulkUploadDialog
      open={open}
      onOpenChange={onOpenChange}
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
      ]}
    />
  );
}
