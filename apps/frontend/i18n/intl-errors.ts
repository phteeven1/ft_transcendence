import { IntlError, IntlErrorCode } from 'use-intl/core';

export function onIntlError(error: IntlError): void {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) return;
}

export function getIntlMessageFallback({
  namespace,
  key,
}: {
  key: string;
  namespace?: string;
}): string {
  return namespace ? `${namespace}.${key}` : key;
}
