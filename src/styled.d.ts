/**
 * styled.d.ts
 * 
 * Module augmentation for styled-components.
 * Extends DefaultTheme with our custom theme shape so all
 * theme properties are type-safe in styled components.
 */
import 'styled-components';
import { theme } from './styles/theme';

type ThemeType = typeof theme;

declare module 'styled-components' {
    export interface DefaultTheme extends ThemeType { }
}
