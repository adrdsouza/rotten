import { useContext } from '@builder.io/qwik';
import { APP_STATE } from '~/constants';
import { AppState } from '~/types';

export function useCart() {
  const appState: AppState = useContext(APP_STATE);
  return {
    get value() {
      return appState.activeOrder;
    },
  };
}