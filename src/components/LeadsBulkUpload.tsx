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
      errors: [] as any[],
    };

    // Check for duplicates in database before inserting
    const phones = data.map(lead => lead.phone);
    const emails = data.filter(lead => lead.email).map(lead => lead.email);

    const { data: existingLeads } = await supabase
      .from('leads')
      .select('phone, email')
      .or(`phone.in.(${phones.join(',')}),email.in.(${emails.join(',')})`);

    const existingPhones = new Set(existingLeads?.map(l => l.phone) || []);
    const existingEmails = new Set(existingLeads?.map(l => l.email).filter(Boolean) || []);

    // Filter out duplicates
    const leadsToInsert = data.filter((lead, index) => {
      if (existingPhones.has(lead.phone)) {
        results.failed++;
        results.errors.push({
          row: index + 2,
          error: `Duplicate phone number: ${lead.phone}`,
        });
        return false;
      }
      if (lead.email && existingEmails.has(lead.email)) {
        results.failed++;
        results.errors.push({
          row: index + 2,
          error: `Duplicate email: ${lead.email}`,
        });
        return false;
      }
      return true;
    });

    if (leadsToInsert.length === 0) {
      toast({
        title: 'Upload Failed',
        description: 'All leads are duplicates',
        variant: 'destructive',
      });
      return results;
    }

    const leadsWithCreatedBy = leadsToInsert.map(lead => ({
      ...lead,
      created_by: user.id,
    }));

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
        description: `${results.success} leads uploaded successfully${results.failed > 0 ? `, ${results.failed} duplicates skipped` : ''}`,
      });
      onSuccess();
    }

    if (results.failed > 0 && results.success === 0) {
      toast({
        title: 'Upload Failed',
        description: `${results.failed} leads failed (duplicates or errors)`,
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
      description="Upload multiple leads with just 4 fields: name, phone (will be normalized to +91), email (optional), and source (manual/website/meta/google/referral/other). Download the template to see the format."
      templateData={templateData}
      templateFilename="leads_template.csv"
      onUpload={handleUpload}
      validateData={validateLeads}
    />
  );
}
