/** Every species with lab rendering options, in the order of the City mix weights (docs/tree-species.md). */
import type { Look } from './looks';
import { waterOakLook, willowOakLook } from './oaks';
import { loblollyPineLook, tulipPoplarLook } from './pine-poplar';

export const LOOKS: Look[] = [willowOakLook, waterOakLook, loblollyPineLook, tulipPoplarLook];
