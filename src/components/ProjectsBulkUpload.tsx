import { BulkUploadDialog } from './BulkUploadDialog';
import { validateProjects } from '@/lib/uploadValidators';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectsBulkUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const templateData = [
  {
    name: 'Skyline Residency',
    location: 'Mumbai, Andheri West',
    project_type: 'residential',
    price: 8500000,
    price_min: 7500000,
    price_max: 12000000,
    description: 'Luxury 3BHK apartments with modern amenities',
    bedrooms: 3,
    bathrooms: 2,
    size_sqft: 1250,
    tags: 'premium,ready-to-move',
  },
];

export function ProjectsBulkUpload({ open, onOpenChange, onSuccess }: ProjectsBulkUploadProps) {
  const { toast } = useToast();

  const handleUpload = async (data: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const projectsWithCreatedBy = data.map(project => ({
      ...project,
      created_by: user.id,
    }));

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    const batchSize = 100;
    for (let i = 0; i < projectsWithCreatedBy.length; i += batchSize) {
      const batch = projectsWithCreatedBy.slice(i, i + batchSize);
      
      const { data: inserted, error } = await supabase
        .from('projects')
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
        description: `${results.success} projects uploaded successfully`,
      });
      onSuccess();
    }

    if (results.failed > 0) {
      toast({
        title: 'Partial Upload',
        description: `${results.failed} projects failed to upload`,
        variant: 'destructive',
      });
    }

    return results;
  };

  return (
    <BulkUploadDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Upload Projects"
      description="Upload multiple projects at once using a CSV or Excel file. Download the template to see the required format."
      templateData={templateData}
      templateFilename="projects_template.csv"
      onUpload={handleUpload}
      validateData={validateProjects}
    />
  );
}
