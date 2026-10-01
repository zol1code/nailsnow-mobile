// Uses Material Icons on Android and web.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
} from 'react-native';

// Only string symbol names can be used as mapping keys.
type IconMapping = Partial<
  Record<
    Extract<SymbolViewProps['name'], string>,
    ComponentProps<typeof MaterialIcons>['name']
  >
>;

// Keeps the existing icons and checks their names.
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
} satisfies IconMapping;

type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}