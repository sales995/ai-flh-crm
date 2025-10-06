import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParseResult {
  data: any[];
  errors: Array<{ row: number; message: string }>;
}

export const parseCSV = (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const errors = results.errors.map((error, index) => ({
          row: error.row || index,
          message: error.message,
        }));
        resolve({
          data: results.data,
          errors,
        });
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [{ row: 0, message: error.message }],
        });
      },
    });
  });
};

export const parseExcel = (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        resolve({
          data: jsonData,
          errors: [],
        });
      } catch (error) {
        resolve({
          data: [],
          errors: [{ row: 0, message: error instanceof Error ? error.message : 'Failed to parse Excel file' }],
        });
      }
    };
    reader.onerror = () => {
      resolve({
        data: [],
        errors: [{ row: 0, message: 'Failed to read file' }],
      });
    };
    reader.readAsBinaryString(file);
  });
};

export const parseFile = async (file: File): Promise<ParseResult> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    return {
      data: [],
      errors: [{ row: 0, message: 'Unsupported file format. Please upload CSV or Excel file.' }],
    };
  }
};

export const generateCSV = (data: any[], filename: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
