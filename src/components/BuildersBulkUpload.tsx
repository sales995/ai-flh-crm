import { BulkUploadDialog } from './BulkUploadDialog';
import { validateBuilders } from '@/lib/uploadValidators';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BuildersBulkUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const templateData = [
  {
    name: 'Prestige Group',
    category: 'Premium',
    contact_number: '+919876543210',
    location: 'Bangalore',
    cp_spoc_name: 'Rajesh Kumar',
    google_map_link: 'https://maps.google.com/?q=12.9716,77.5946',
    latitude: 12.9716,
    longitude: 77.5946,
  },
];

export function BuildersBulkUpload({ open, onOpenChange, onSuccess }: BuildersBulkUploadProps) {
  const { toast } = useToast();

  const handleUpload = async (data: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const buildersWithCreatedBy = data.map(builder => ({
      ...builder,
      created_by: user.id,
    }));

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    const batchSize = 100;
    for (let i = 0; i < buildersWithCreatedBy.length; i += batchSize) {
      const batch = buildersWithCreatedBy.slice(i, i + batchSize);
      
      const { data: inserted, error } = await supabase
        .from('builders')
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
        description: `${results.success} builders uploaded successfully`,
      });
      onSuccess();
    }

    if (results.failed > 0) {
      toast({
        title: 'Partial Upload',
        description: `${results.failed} builders failed to upload`,
        variant: 'destructive',
      });
    }

    return results;
  };

  return (
    <BulkUploadDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Upload Builders"
      description="Upload multiple builders at once using a CSV or Excel file. Download the template to see the required format."
      templateData={templateData}
      templateFilename="builders_template.csv"
      onUpload={handleUpload}
      validateData={validateBuilders}
    />
  );
}
