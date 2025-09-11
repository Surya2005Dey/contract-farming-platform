import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Update the trigger function
    const triggerSQL = `
      -- Update the profile trigger to properly handle all user data
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        INSERT INTO public.profiles (id, user_type, full_name, phone, company_name)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'farmer'),
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
          NEW.raw_user_meta_data ->> 'phone',
          CASE 
            WHEN NEW.raw_user_meta_data ->> 'user_type' = 'buyer' 
            THEN NEW.raw_user_meta_data ->> 'company_name'
            ELSE NULL
          END
        )
        ON CONFLICT (id) DO UPDATE SET
          user_type = EXCLUDED.user_type,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          company_name = EXCLUDED.company_name,
          updated_at = NOW();
        
        RETURN NEW;
      END;
      $$;

      -- Ensure the trigger exists and is active
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    `

    const { error: sqlError } = await supabase.rpc('exec', { 
      sql: triggerSQL 
    })

    if (sqlError) {
      // Try alternative approach - execute as raw query
      const { error: directError } = await supabase
        .from('profiles') // Just use any table to get connection
        .select('count')
        .limit(0)

      // Since we can't execute DDL directly, let's just return the SQL
      return NextResponse.json({
        success: false,
        message: 'Cannot execute DDL from API. Please run this SQL manually in Supabase dashboard:',
        sql: triggerSQL,
        error: sqlError?.message || directError?.message
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Trigger updated successfully'
    })

  } catch (error) {
    console.error('Update trigger error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
