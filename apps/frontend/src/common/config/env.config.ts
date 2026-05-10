/**
 * Environment Configuration
 * Centralized management of environment variables
 * Type-safe access to all env variables
 */

interface EnvConfig {
  API_URL: string;
  API_TIMEOUT: number;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  ENABLE_MOCK_API: boolean;
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';
const isStaging = import.meta.env.MODE === 'staging';

/**
 * Get environment variable with type safety
 * @param key - Environment variable key
 * @param defaultValue - Default value if not found
 * @returns Value from env or default
 */
const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[`VITE_${key}`];
  if (!value && !defaultValue) {
    console.warn(`Environment variable VITE_${key} is not defined`);
  }
  return value || defaultValue || '';
};

/**
 * Centralized environment configuration
 * Usage: import { envConfig } from '@/common/config/env.config'
 */
export const envConfig: EnvConfig = {
  // API Configuration
  API_URL: getEnvVariable(
    'API_URL',
    isDevelopment ? 'http://localhost:8080' : 'https://api.ecotel.com'
  ),

  // API Timeout in milliseconds
  API_TIMEOUT: parseInt(getEnvVariable('API_TIMEOUT', '30000')),

  // Logging Level
  LOG_LEVEL: (getEnvVariable('LOG_LEVEL', isDevelopment ? 'debug' : 'info') as any),

  // Feature Flags
  ENABLE_MOCK_API: getEnvVariable('ENABLE_MOCK_API', 'false') === 'true',

  // App Metadata
  APP_NAME: getEnvVariable('APP_NAME', 'ECOTEL App'),
  APP_VERSION: getEnvVariable('APP_VERSION', '1.0.0'),

  // Environment
  ENVIRONMENT: (import.meta.env.MODE as EnvConfig['ENVIRONMENT']) || 'development',
};

/**
 * Environment Status Checks
 */
export const isEnv = {
  isDevelopment,
  isProduction,
  isStaging,
  isTest: import.meta.env.MODE === 'test',
};

/**
 * Validation: Check if required env vars are set
 */
const validateEnvConfig = () => {
  const requiredVars = ['API_URL'];
  const missingVars = requiredVars.filter(
    (key) => !import.meta.env[`VITE_${key}`]
  );

  if (missingVars.length > 0 && isProduction) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};

// Validate on module load
validateEnvConfig();

export default envConfig;
