// Multi-Tenant Authentication API Endpoints
// This file contains the additional API endpoints for multi-tenant authentication
// Import this into server.js to add these endpoints

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnejFkaWxtdHVxdmltb2x6eG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MDEyMzMsImV4cCI6MjA0OTQ3NzIzM30.e80AhUU44MNlXZpJR4LPcQB8sWhRn-kNLjFDFPuwCx4';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to extract user from request (if authenticated)
async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error extracting user from request:', error);
    return null;
  }
}

// Function to add authentication endpoints to an Express app
export function addAuthEndpoints(app) {
  
  // Get user profile with organization info
  app.get('/api/auth/profile', async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          *,
          organizations (
            id,
            name,
            slug,
            logo_url,
            domain,
            settings,
            subscription_tier,
            is_active
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profile,
        organization: profile.organizations
      });

    } catch (error) {
      console.error('Error in /api/auth/profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user profile
  app.put('/api/auth/profile', async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { first_name, last_name, phone_number, avatar_url, timezone, preferences } = req.body;

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          first_name,
          last_name,
          phone_number,
          avatar_url,
          timezone,
          preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, profile: data });

    } catch (error) {
      console.error('Error in /api/auth/profile PUT:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create organization (for new signups)
  app.post('/api/auth/organizations', async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, slug, domain, phone_number, email } = req.body;

      // Validate required fields
      if (!name || !slug) {
        return res.status(400).json({ error: 'Organization name and slug are required' });
      }

      // Check if slug is already taken
      const { data: existingOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingOrg) {
        return res.status(409).json({ error: 'Organization slug already taken' });
      }

      // Create organization
      const { data: organization, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name,
          slug,
          domain,
          phone_number,
          email: email || user.email,
          settings: {
            created_by: user.id,
            features: {
              telephony: true,
              analytics: true,
              lead_management: true
            }
          }
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        return res.status(400).json({ error: orgError.message });
      }

      // Create or update user profile with organization
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: user.id,
          organization_id: organization.id,
          email: user.email,
          role: 'admin',
          is_active: true,
          timezone: 'UTC',
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
      }

      // Create organization membership
      const { error: membershipError } = await supabaseAdmin
        .from('organization_memberships')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          role: 'admin',
          is_active: true,
          permissions: {
            all: true
          }
        });

      if (membershipError) {
        console.error('Error creating membership:', membershipError);
      }

      res.status(201).json({ success: true, organization });

    } catch (error) {
      console.error('Error in /api/auth/organizations POST:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get organization details
  app.get('/api/auth/organizations/:id', async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      // Get organization details with user access check
      const { data: organization, error } = await supabaseAdmin
        .from('organizations')
        .select(`
          *,
          organization_memberships!inner (
            role,
            is_active
          )
        `)
        .eq('id', id)
        .eq('organization_memberships.user_id', user.id)
        .eq('organization_memberships.is_active', true)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        return res.status(404).json({ error: 'Organization not found or access denied' });
      }

      res.json({ 
        organization,
        userRole: organization.organization_memberships[0]?.role 
      });

    } catch (error) {
      console.error('Error in /api/auth/organizations/:id GET:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  console.log('✅ Multi-tenant authentication endpoints added');
}

export { getUserFromRequest, supabaseAdmin }; 
