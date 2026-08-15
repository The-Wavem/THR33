import { lazy } from 'react';

export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_force_refreshed') || 'false',
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('page_has_been_force_refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
