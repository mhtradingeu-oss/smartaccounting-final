export function getSafeErrorMeta(error) {
  if (!error) {
    return undefined;
  }

  const method = error?.config?.method?.toUpperCase?.();
  return {
    status: error?.response?.status ?? null,
    method: method || null,
    url: error?.config?.url ?? null,
    message: error?.message ?? null,
  };
}
