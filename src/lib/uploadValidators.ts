import { z } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
  data: any[];
}

const leadSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(20),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  source: z.enum(['manual', 'website', 'meta', 'google', 'referral', 'other'], {
    errorMap: () => ({ message: 'Source must be one of: manual, website, meta, google, referral, other' }),
  }),
});

// Normalize phone number to E.164 format
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  
  return digits.startsWith('+') ? digits : `+${digits}`;
};

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  location: z.string().min(1, 'Location is required'),
  project_type: z.enum(['residential', 'commercial', 'land']),
  price: z.coerce.number().positive('Price must be positive'),
  price_min: z.coerce.number().positive().optional().or(z.literal('')),
  price_max: z.coerce.number().positive().optional().or(z.literal('')),
  description: z.string().optional(),
  bedrooms: z.coerce.number().int().positive().optional().or(z.literal('')),
  bathrooms: z.coerce.number().int().positive().optional().or(z.literal('')),
  size_sqft: z.coerce.number().int().positive().optional().or(z.literal('')),
  tags: z.string().optional(),
});

const builderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().optional(),
  contact_number: z.string().max(20).optional(),
  location: z.string().optional(),
  cp_spoc_name: z.string().optional(),
  google_map_link: z.string().url('Invalid URL').optional().or(z.literal('')),
  latitude: z.coerce.number().optional().or(z.literal('')),
  longitude: z.coerce.number().optional().or(z.literal('')),
});

const cleanEmptyValues = (obj: any) => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== '' && value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

export const validateLeads = (data: any[]): ValidationResult => {
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const validData: any[] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();

  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and row 1 is header
    const cleanedRow = cleanEmptyValues(row);

    const result = leadSchema.safeParse(cleanedRow);
    if (!result.success) {
      result.error.errors.forEach((error) => {
        errors.push({
          row: rowNumber,
          field: error.path.join('.'),
          message: error.message,
        });
      });
    } else {
      // Normalize phone
      const normalizedPhone = normalizePhone(result.data.phone);
      
      // Check for duplicate phone within file
      if (seenPhones.has(normalizedPhone)) {
        errors.push({
          row: rowNumber,
          field: 'phone',
          message: 'Duplicate phone number in upload file',
        });
        return;
      }
      seenPhones.add(normalizedPhone);

      // Check for duplicate email within file (if provided)
      if (result.data.email) {
        if (seenEmails.has(result.data.email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Duplicate email in upload file',
          });
          return;
        }
        seenEmails.add(result.data.email);
      }

      validData.push({
        name: result.data.name,
        phone: normalizedPhone,
        email: result.data.email || null,
        source: result.data.source,
        status: 'new',
        consent: true,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: validData,
  };
};

export const validateProjects = (data: any[]): ValidationResult => {
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const validData: any[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const cleanedRow = cleanEmptyValues(row);
    
    if (cleanedRow.tags && typeof cleanedRow.tags === 'string') {
      cleanedRow.tags = cleanedRow.tags.split(',').map((t: string) => t.trim());
    }

    const result = projectSchema.safeParse(cleanedRow);
    if (!result.success) {
      result.error.errors.forEach((error) => {
        errors.push({
          row: rowNumber,
          field: error.path.join('.'),
          message: error.message,
        });
      });
    } else {
      validData.push({
        ...result.data,
        is_active: true,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: validData,
  };
};

export const validateBuilders = (data: any[]): ValidationResult => {
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const validData: any[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;
    const cleanedRow = cleanEmptyValues(row);

    const result = builderSchema.safeParse(cleanedRow);
    if (!result.success) {
      result.error.errors.forEach((error) => {
        errors.push({
          row: rowNumber,
          field: error.path.join('.'),
          message: error.message,
        });
      });
    } else {
      validData.push(result.data);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: validData,
  };
};
