/** Every species built in the lab. City places only what docs/tree-species.md says it may. */
import { ginkgo } from './ginkgo';
import { waterOak, willowOak } from './oaks';
import { loblollyPine, tulipPoplar } from './pine-poplar';
import { redMaple, sweetgum } from './maple-sweetgum';
import type { Species } from './species';

export const SPECIES: Species[] = [ginkgo, willowOak, waterOak, loblollyPine, tulipPoplar, redMaple, sweetgum];
