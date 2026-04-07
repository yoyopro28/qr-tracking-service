function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  databaseUrl: getEnv("DATABASE_URL"),
  appUrl: getEnv("NEXT_PUBLIC_APP_URL"),
};
