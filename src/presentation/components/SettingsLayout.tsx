import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import { ListGroup, ListRow, Screen, ScreenHeader } from '@/src/ui';

/**
 * Moldura das telas de Conta/Ajustes, construída sobre `src/ui`. A API (`SettingsLayout`,
 * `SettingsGroup`, `SettingsLink`) é mantida para as subtelas existentes (preferências, legal,
 * suporte, Admin).
 */
export function SettingsLayout({ title, children, back = true }: PropsWithChildren<{ title: string; back?: boolean }>) {
  return (
    <Screen inTabs={!back} header={<ScreenHeader title={title} back={back} backLabel="Voltar aos Ajustes" fallbackHref="/settings" large={!back} />}>
      {children}
    </Screen>
  );
}

export function SettingsGroup({ title, children }: PropsWithChildren<{ title: string }>) {
  return <ListGroup title={title}>{children}</ListGroup>;
}

export function SettingsLink({ title, description, icon, onPress }: { title: string; description?: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return <ListRow title={title} description={description} icon={icon} onPress={onPress} />;
}
