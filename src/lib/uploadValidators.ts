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
const normalizePhone = (input: any): string | null => {
  if (input === null || input === undefined) return null;
  
  // Convert to string (handles numeric input from CSV)
  let s = String(input).trim();
  
  // Remove spaces, dots, parentheses, and hyphens
  s = s.replace(/[\s\.\(\)\-]/g, '');
  
  // If it starts with '00', replace with '+'
  if (s.startsWith('00')) {
    s = '+' + s.slice(2);
  }
  
  // If exactly 10 digits without country code, add +91 (India)
  if (/^[0-9]{10}$/.test(s)) {
    s = '+91' + s;
  }
  
  // If it has digits but no +, add +
  if (/^[0-9]/.test(s) && !s.startsWith('+')) {
    s = '+' + s;
  }
  
  return s;
};

// Normalize source names with alias mapping
const normalizeSource = (src: any): string => {
  if (!src) return 'manual';
  
  const val = String(src).trim().toLowerCase();
  
  const map: Record<string, string> = {
    'manual': 'manual',
    'website': 'website',
    'web': 'website',
    'site': 'website',
    'meta': 'meta',
    'facebook': 'meta',
    'fb': 'meta',
    'instagram': 'meta',
    'insta': 'meta',
    'google': 'google',
    'gads': 'google',
    'adwords': 'google',
    'google ads': 'google',
    'referral': 'referral',
    'referal': 'referral',
    'recommendation': 'referral',
    'refer': 'referral',
    'reference': 'referral',
    'other': 'other',
    'others': 'other'
  };
  
  return map[val] || 'other';
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

// Optional lead details schema
const leadDetailsSchema = z.object({
  preferred_location: z.string().optional(),
  radius: z.coerce.number().positive().optional().or(z.literal('')),
  property_type: z.string().optional(),
  bhk: z.string().optional(),
  size_min: z.coerce.number().positive().optional().or(z.literal('')),
  size_max: z.coerce.number().positive().optional().or(z.literal('')),
  facing: z.string().optional(),
  budget_min_detail: z.coerce.number().positive().optional().or(z.literal('')),
  budget_max_detail: z.coerce.number().positive().optional().or(z.literal('')),
  additional_requirements: z.string().optional(),
  purchase_intent: z.string().optional(),
  buying_for: z.string().optional(),
  roi_months: z.coerce.number().positive().optional().or(z.literal('')),
});

export const validateLeads = (data: any[]): ValidationResult => {
  const errors: Array<{ row: number; field: string; message: string }> = [];
  const validData: any[] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();

  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index starts at 0 and row 1 is header
    const cleanedRow = cleanEmptyValues(row);

    // Normalize phone and source BEFORE validation
    const normalizedPhone = normalizePhone(cleanedRow.phone);
    const normalizedSource = normalizeSource(cleanedRow.source);
    
    if (!normalizedPhone) {
      errors.push({
        row: rowNumber,
        field: 'phone',
        message: 'Invalid phone number',
      });
      return;
    }

    // Update row with normalized values
    cleanedRow.phone = normalizedPhone;
    cleanedRow.source = normalizedSource;

    // Validate core lead fields
    const coreResult = leadSchema.safeParse(cleanedRow);
    if (!coreResult.success) {
      coreResult.error.errors.forEach((error) => {
        errors.push({
          row: rowNumber,
          field: error.path.join('.'),
          message: error.message,
        });
      });
      return;
    }
    
    // Check for duplicate phone within file
    if (seenPhones.has(coreResult.data.phone)) {
      errors.push({
        row: rowNumber,
        field: 'phone',
        message: 'Duplicate phone number in upload file',
      });
      return;
    }
    seenPhones.add(coreResult.data.phone);

    // Check for duplicate email within file (if provided)
    if (coreResult.data.email) {
      if (seenEmails.has(coreResult.data.email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Duplicate email in upload file',
        });
        return;
      }
      seenEmails.add(coreResult.data.email);
    }

    // Validate optional lead details
    const detailsResult = leadDetailsSchema.safeParse(cleanedRow);
    let details = {};
    
    if (detailsResult.success) {
      // Only include non-empty optional fields
      details = Object.fromEntries(
        Object.entries(detailsResult.data).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
      );
    }

    validData.push({
      core: {
        name: coreResult.data.name,
        phone: coreResult.data.phone,
        email: coreResult.data.email || null,
        source: coreResult.data.source,
        status: 'new',
        consent: true,
      },
      details,
    });
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
