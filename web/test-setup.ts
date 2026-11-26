// Vitest's worker reports progress over messages with a fixed 60 s limit. Synchronous tests run one
// after another without letting the replies in, so a slow machine (CI) fails the run with
// "Timeout calling onTaskUpdate" although every test passed. Turn the event loop between tests;
// the longest tests also turn it between their own steps.
import { afterEach } from 'vitest';
import { turn } from './src/testing/turn';

afterEach(turn);
