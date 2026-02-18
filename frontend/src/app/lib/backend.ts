const normalizeUrl = (value: string) => value.replace(/\/$/, "");

export const getBackendBaseUrl = () => {
  const privateUrl = process.env.BACKEND_BASE_URL;
  if (privateUrl) return normalizeUrl(privateUrl);

  const publicUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (publicUrl) return normalizeUrl(publicUrl);

  return "http://localhost:8000";
};
