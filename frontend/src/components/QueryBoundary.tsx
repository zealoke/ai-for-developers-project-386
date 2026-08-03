import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { describeApiError } from '../api/errors';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T, unknown>;
  children: (data: T) => ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Единая обработка состояний загрузки/ошибки для запросов TanStack Query.
 * Используется на всех страницах, чтобы не размазывать if(isPending)/if(isError)
 * по компонентам.
 */
export function QueryBoundary<T>({ query, children, loadingFallback }: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return (
      loadingFallback ?? (
        <Center py="xl">
          <Loader />
        </Center>
      )
    );
  }

  if (query.isError) {
    return (
      <Alert color="red" title="Не удалось загрузить данные" icon={<IconAlertCircle />}>
        <Stack gap="sm">
          <Text size="sm">{describeApiError(query.error)}</Text>
          <Button variant="light" color="red" size="xs" onClick={() => query.refetch()}>
            Повторить
          </Button>
        </Stack>
      </Alert>
    );
  }

  return <>{children(query.data as T)}</>;
}
