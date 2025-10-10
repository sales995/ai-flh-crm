import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { parseFile, generateCSV } from '@/lib/csvParser';
import { AlertCircle, CheckCircle2, Upload, Download, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface EnhancedBulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateData: any[];
  templateFilename: string;
  onUpload: (data: any[]) => Promise<{
    success: number;
    failed: number;
    duplicates?: number;
    errors: any[];
  }>;
  validateData: (data: any[]) => {
    valid: boolean;
    errors: Array<{ row: number; field: string; message: string }>;
    data: any[];
  };
  requiredColumns?: string[];
  optionalColumns?: string[];
}

export function EnhancedBulkUploadDialog({
  open,
  onOpenChange,
  title,
  description,
  templateData,
  templateFilename,
  onUpload,
  validateData,
  requiredColumns = ['name', 'phone', 'email', 'source'],
  optionalColumns = [],
}: EnhancedBulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const allAllowedColumns = [...requiredColumns, ...optionalColumns];

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadResult(null);
    setProgress(0);

    try {
      const result = await parseFile(selectedFile);
      
      if (result.errors.length > 0) {
        setValidationErrors(result.errors);
        return;
      }

      if (result.data.length === 0) {
        setValidationErrors([{ row: 0, message: 'File is empty' }]);
        return;
      }

      // Get column names from first row
      const detectedColumns = Object.keys(result.data[0]);
      setColumns(detectedColumns);

      // Check for unknown columns
      const unknown = detectedColumns.filter(
        col => !allAllowedColumns.includes(col.toLowerCase())
      );
      setUnknownColumns(unknown);

      // Set preview (first 50 rows)
      setPreview(result.data.slice(0, 50));

      // Validate data
      const validation = validateData(result.data);
      setValidationErrors(validation.errors);

    } catch (error: any) {
      setValidationErrors([{ row: 0, message: error.message }]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!file || unknownColumns.length > 0 || validationErrors.length > 0) return;

    setUploading(true);
    setProgress(0);

    try {
      const result = await parseFile(file);
      const validation = validateData(result.data);
      
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setUploading(false);
        return;
      }

      setProgress(50);
      const uploadResult = await onUpload(validation.data);
      setProgress(100);
      setUploadResult(uploadResult);
    } catch (error: any) {
      setValidationErrors([{ row: 0, message: error.message }]);
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setColumns([]);
    setUnknownColumns([]);
    setValidationErrors([]);
    setUploadResult(null);
    setProgress(0);
  };

  const handleDownloadTemplate = () => {
    generateCSV(templateData, templateFilename);
  };

  const handleDownloadErrors = () => {
    const errorData = validationErrors.map(err => ({
      Row: err.row,
      Field: err.field || 'General',
      Error: err.message,
    }));
    generateCSV(errorData, 'upload_errors.csv');
  };

  const getMissingColumns = () => {
    return requiredColumns.filter(col => !columns.includes(col));
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetState(); onOpenChange(open); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Upload File (CSV or Excel)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              } ${!uploading && !uploadResult ? 'cursor-pointer' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !uploading && !uploadResult && document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag & drop your file here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: CSV, XLSX (Max 20MB)
              </p>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Column Detection Info */}
          {columns.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div>
                    <strong>Detected Columns:</strong> {columns.join(', ')}
                  </div>
                  {getMissingColumns().length > 0 && (
                    <div className="text-red-600">
                      <strong>Missing Required Columns:</strong> {getMissingColumns().join(', ')}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Unknown Columns Error */}
          {unknownColumns.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <strong>Unknown columns detected:</strong>
                  <div className="font-mono text-sm">{unknownColumns.join(', ')}</div>
                  <div>
                    These columns are not recognized. Please remove them or update your file.
                  </div>
                  <div className="mt-2">
                    <strong>Allowed columns:</strong>
                    <div className="text-xs mt-1">
                      <div><strong>Required:</strong> {requiredColumns.join(', ')}</div>
                      {optionalColumns.length > 0 && (
                        <div><strong>Optional:</strong> {optionalColumns.join(', ')}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="mt-2"
                  >
                    Download Correct Template
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && unknownColumns.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <strong>Validation Errors ({validationErrors.length}):</strong>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadErrors}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Error Report
                    </Button>
                  </div>
                  <ScrollArea className="h-32">
                    {validationErrors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-sm py-1">
                        Row {error.row}: {error.field && `${error.field} - `}{error.message}
                      </div>
                    ))}
                    {validationErrors.length > 10 && (
                      <div className="text-sm text-muted-foreground mt-2">
                        ... and {validationErrors.length - 10} more errors
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {preview.length > 0 && unknownColumns.length === 0 && (
            <div className="space-y-2">
              <Label>Preview (First 50 rows)</Label>
              <ScrollArea className="h-96 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {columns.map((col) => (
                        <TableHead key={col} className="min-w-[120px]">
                          {col}
                          {requiredColumns.includes(col.toLowerCase()) && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, idx) => {
                      const rowErrors = validationErrors.filter(err => err.row === idx + 2);
                      return (
                        <TableRow
                          key={idx}
                          className={rowErrors.length > 0 ? 'bg-red-50' : ''}
                        >
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          {columns.map((col) => {
                            const hasError = rowErrors.some(err => err.field === col);
                            return (
                              <TableCell
                                key={col}
                                className={hasError ? 'text-red-600 font-medium' : ''}
                              >
                                {row[col] || '-'}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Label>Uploading...</Label>
              <Progress value={progress} />
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold">Upload Complete!</div>
                  <div>✓ Success: {uploadResult.success} leads</div>
                  {uploadResult.failed > 0 && (
                    <div>✗ Failed: {uploadResult.failed} leads</div>
                  )}
                  {uploadResult.duplicates && uploadResult.duplicates > 0 && (
                    <div>⚠ Duplicates marked: {uploadResult.duplicates} leads</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
          {!uploadResult && (
            <Button
              onClick={handleUpload}
              disabled={
                !file ||
                unknownColumns.length > 0 ||
                validationErrors.length > 0 ||
                uploading ||
                getMissingColumns().length > 0
              }
            >
              {uploading ? 'Importing...' : 'Import Leads'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
