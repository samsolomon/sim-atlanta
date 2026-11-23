/** Every species with lab rendering options, in the order of the City mix weights (docs/tree-species.md). */
import type { Look } from './looks';
import { waterOakLook, willowOakLook } from './oaks';

export const LOOKS: Look[] = [willowOakLook, waterOakLook];
