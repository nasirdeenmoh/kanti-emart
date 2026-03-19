import { supabase } from './supabaseClient.js';

export async function handleLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error('Error signing in context:', error, 'Message:', error.message);
    throw error;
  }
  return data;
}

export async function handleSignUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    console.error('Error signing up:', error.message);
    throw error;
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
  window.location.href = 'login.html';
}

export async function getCurrentUser() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  // Fetch from profiles using user.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.warn('Error fetching profile (might not exist yet):', profileError.message);
  }

  return {
    ...user,
    profile: profile || null
  };
}

export function validateFormFields(email, password) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  const passRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-])[a-zA-Z0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]{8,}$/;
  const isPassValid = passRegex.test(password);

  return { isEmailValid, isPassValid };
}
