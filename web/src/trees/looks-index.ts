import { lacebarkElmLook } from './lacebark-elm';
import { calleryPearLook } from './callery-pear';
import { easternRedbudLook } from './redbud';
/** Every species with lab rendering options, in the order of the City mix weights (docs/tree-species.md). */
import { whiteOakLook } from './white-oak';
import type { Look } from './looks';
import { waterOakLook, willowOakLook } from './oaks';
import { loblollyPineLook, tulipPoplarLook } from './pine-poplar';
import { redMapleLook, sweetgumLook } from './maple-sweetgum';
import { crapeMyrtleLook, southernMagnoliaLook } from './magnolia-crape';
import { japaneseMapleLook } from './japanese-maple';
import { americanElmLook, floweringDogwoodLook } from './elm-dogwood';

export const LOOKS: Look[] = [willowOakLook, waterOakLook, loblollyPineLook, tulipPoplarLook, redMapleLook, sweetgumLook, southernMagnoliaLook, crapeMyrtleLook, americanElmLook, floweringDogwoodLook, japaneseMapleLook, whiteOakLook, easternRedbudLook, calleryPearLook, lacebarkElmLook];
