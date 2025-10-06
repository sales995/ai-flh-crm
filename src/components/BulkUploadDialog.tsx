import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { parseFile, generateCSV } from '@/lib/csvParser';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateData: any[];
  templateFilename: string;
  onUpload: (data: any[]) => Promise<{ success: number; failed: number; errors: any[] }>;
  validateData: (data: any[]) => { valid: boolean; errors: any[]; data: any[] };
  maxRows?: number;
  maxFileSize?: number;
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  title,
  description,
  templateData,
  templateFilename,
  onUpload,
  validateData,
  maxRows = 1000,
  maxFileSize = 5 * 1024 * 1024, // 5MB
}: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: any[] } | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setValidationErrors([]);
    setUploadResult(null);
    setParsedData([]);

    if (selectedFile.size > maxFileSize) {
      setValidationErrors([{ row: 0, message: `File size exceeds ${maxFileSize / (1024 * 1024)}MB limit` }]);
      return;
    }

    const result = await parseFile(selectedFile);
    if (result.errors.length > 0) {
      setValidationErrors(result.errors);
      return;
    }

    if (result.data.length > maxRows) {
      setValidationErrors([{ row: 0, message: `File contains ${result.data.length} rows. Maximum allowed is ${maxRows}` }]);
      return;
    }

    const validation = validateData(result.data);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
    }
    setParsedData(validation.data);
  }, [maxFileSize, maxRows, validateData]);

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const result = await onUpload(parsedData);
      setUploadResult(result);
      setProgress(100);
      
      if (result.failed === 0) {
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 2000);
      }
    } catch (error) {
      setValidationErrors([{ row: 0, message: error instanceof Error ? error.message : 'Upload failed' }]);
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setUploadResult(null);
    setProgress(0);
  };

  const handleDownloadTemplate = () => {
    generateCSV(templateData, templateFilename);
  };

  const handleDownloadErrors = () => {
    if (uploadResult && uploadResult.errors.length > 0) {
      generateCSV(uploadResult.errors, 'upload_errors.csv');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV or Excel files (max {maxFileSize / (1024 * 1024)}MB, {maxRows} rows)
              </p>
            </label>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ScrollArea className="h-32">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-sm">
                      {error.row > 0 ? `Row ${error.row}: ` : ''}
                      {error.field ? `${error.field} - ` : ''}
                      {error.message}
                    </div>
                  ))}
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && validationErrors.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {parsedData.length} valid records ready to upload
              </AlertDescription>
            </Alert>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">Uploading...</p>
            </div>
          )}

          {uploadResult && (
            <Alert variant={uploadResult.failed === 0 ? 'default' : 'destructive'}>
              {uploadResult.failed === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                <div className="space-y-2">
                  <p>Upload complete: {uploadResult.success} succeeded, {uploadResult.failed} failed</p>
                  {uploadResult.failed > 0 && (
                    <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Error Report
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={parsedData.length === 0 || uploading || validationErrors.length > 0}
          >
            Upload {parsedData.length > 0 && `(${parsedData.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
