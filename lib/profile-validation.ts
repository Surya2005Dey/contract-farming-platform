export interface UserProfile {
  id: string;
  user_type: 'farmer' | 'buyer';
  full_name: string;
  phone?: string | null;
  location?: string | null;
  farm_size?: number | null;
  specialization?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateUserProfile(profile: UserProfile): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields for all users
  if (!profile.full_name || profile.full_name.trim() === '') {
    errors.push({ field: 'full_name', message: 'Full name is required' });
  }

  if (!profile.user_type || !['farmer', 'buyer'].includes(profile.user_type)) {
    errors.push({ field: 'user_type', message: 'Valid user type (farmer/buyer) is required' });
  }

  // Optional field validations
  if (profile.phone && profile.phone.trim() !== '') {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(profile.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push({ field: 'phone', message: 'Invalid phone number format' });
    }
  }

  return errors;
}

export function isProfileComplete(profile: UserProfile): boolean {
  return validateUserProfile(profile).length === 0;
}

export function getRequiredFields(userType: 'farmer' | 'buyer'): string[] {
  const baseFields = ['full_name', 'user_type'];
  
  // Both farmers and buyers have the same required fields now
  return baseFields;
}

export function getProfileCompletionPercentage(profile: UserProfile): number {
  const allFields = ['full_name', 'user_type', 'phone'];
  // No type-specific fields anymore - both farmers and buyers have the same fields
  const totalFields = allFields;
  
  let completedFields = 0;
  
  // Check basic fields
  if (profile.full_name && profile.full_name.trim() !== '') completedFields++;
  if (profile.user_type) completedFields++;
  if (profile.phone && profile.phone.trim() !== '') completedFields++;
  
  return Math.round((completedFields / totalFields.length) * 100);
}
