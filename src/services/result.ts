export type ServiceFailure = {
  ok: false;
  code: string;
  message: string;
};

export type ServiceResult<T> = { ok: true; value: T } | ServiceFailure;

export function fail(code: string, message: string): ServiceFailure {
  return { ok: false, code, message };
}
