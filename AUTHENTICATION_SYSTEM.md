# Custom Authentication System Documentation

## Overview
This authentication system validates user data during both sign-up and login processes, ensuring data integrity and completeness before allowing access to the application.

## Authentication Flow

### Sign-Up Process
1. **User submits registration form** with required fields:
   - Email, password, full name, user type (required)
   - Phone, location, specialization (optional)
   - Farmer-specific: farm size (required)
   - Buyer-specific: company name (required)

2. **API validates input data** before creating user
3. **Supabase auth user is created** with email confirmation
4. **Profile is automatically created** via database trigger
5. **Profile is updated** with additional user data
6. **Validation is performed** on the complete profile
7. **User is redirected** to email confirmation page

### Login Process
1. **User submits credentials** (email/password)
2. **Supabase authentication** is performed first
3. **Profile existence is verified** in database
4. **Profile data is validated** against business rules
5. **Email confirmation is checked**
6. **Last login timestamp is updated**
7. **User is granted access** if all validations pass

## Validation Rules

### All Users
- ✅ Full name is required and non-empty
- ✅ User type must be either "farmer" or "buyer"
- ✅ Email must be confirmed

### Farmers
- ✅ Farm size is required and must be > 0
- ✅ Specialization is optional but recommended

### Buyers
- ✅ Company name is required and non-empty
- ✅ Industry focus is optional but recommended

### Optional Fields
- 📞 Phone: Must match valid format if provided
- 📍 Location: Free text field
- 🏷️ Specialization: Array of specialties

## API Endpoints

### POST /api/auth/signup
Creates new user account with complete profile data.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe",
  "userType": "farmer",
  "phone": "+1234567890",
  "location": "California, USA",
  "farmSize": "10.5",
  "specialization": "Rice, Wheat, Corn"
}
```

**Response:**
```json
{
  "success": true,
  "user": { "id": "...", "email": "..." },
  "profile": { "id": "...", "user_type": "farmer", ... },
  "needsEmailConfirmation": true
}
```

### POST /api/auth/login
Authenticates user with comprehensive validation.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": { "id": "...", "email": "..." },
  "profile": { "id": "...", "user_type": "farmer", ... },
  "session": { "access_token": "...", ... }
}
```

### GET /api/auth/profile-status
Checks current user's profile status and validation.

**Response:**
```json
{
  "hasProfile": true,
  "isValid": true,
  "completionPercentage": 85,
  "validationErrors": [],
  "profile": { ... },
  "user": { ... }
}
```

## Error Codes

### LOGIN_ERRORS
- `EMAIL_NOT_VERIFIED`: User needs to confirm email
- `PROFILE_NOT_FOUND`: User profile missing from database
- `PROFILE_INVALID`: Profile data doesn't meet requirements

### SIGNUP_ERRORS
- `VALIDATION_ERROR`: Input data validation failed
- `USER_EXISTS`: Email already registered
- `PROFILE_CREATION_FAILED`: Database error during profile creation

## Database Schema

### profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  user_type TEXT NOT NULL CHECK (user_type IN ('farmer', 'buyer')),
  full_name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  company_name TEXT, -- For buyers
  farm_size DECIMAL, -- For farmers
  specialization TEXT[], -- Array of specializations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Features

### Data Validation
- ✅ Server-side validation on all inputs
- ✅ Type checking and format validation
- ✅ Business rule enforcement

### Access Control
- ✅ Row Level Security (RLS) policies
- ✅ Profile ownership validation
- ✅ Email confirmation requirement

### Error Handling
- ✅ Specific error messages for debugging
- ✅ Graceful degradation on failures
- ✅ User-friendly error display

## Usage Examples

### Frontend Integration
```typescript
// Login with validation
const handleLogin = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.code === 'PROFILE_INVALID') {
    // Redirect to profile completion
    router.push('/profile/complete');
  } else if (data.success) {
    // Login successful
    router.push('/dashboard');
  }
};
```

### Profile Validation Check
```typescript
// Check profile status
const checkProfileStatus = async () => {
  const response = await fetch('/api/auth/profile-status');
  const data = await response.json();
  
  if (data.completionPercentage < 100) {
    // Show profile completion prompt
    showProfileCompletionDialog(data.validationErrors);
  }
};
```

## Troubleshooting

### Common Issues
1. **"Profile not found" error**: Database trigger may have failed
2. **"Profile invalid" error**: Check required fields for user type
3. **Email not sending**: Verify Supabase SMTP configuration
4. **Login fails after signup**: User needs to confirm email first

### Debug Steps
1. Check Supabase Auth dashboard for user creation
2. Verify profiles table has corresponding record
3. Run profile validation to see specific issues
4. Check email confirmation status
