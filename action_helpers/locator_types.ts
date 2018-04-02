/**
 * Interface for positional locators used to find elements under, left of,
 * right of, or inside other elements.
 */
import {Locator} from 'protractor';

export type FlexibleLocator = string|RegExp|Locator;

export enum Position {
  GLOBAL = 'global',
  RIGHTOF = 'rightOf',
  LEFTOF = 'leftOf',
  BELOW = 'below',
  UNDER = 'under',
  INSIDE = 'inside',
}

export interface PositionalLocator {
  locator: FlexibleLocator;
  position: Position;
}
