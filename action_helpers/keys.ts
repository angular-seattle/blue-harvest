/**
 * Keys and key combinations commonly used in Pantheon tests. Most of these
 * are direct exports from protractor.Keys, and in most cases users should
 * grab keys directly from there instead of adding new exports to this file.
 */
import {protractor} from 'protractor';

export const CLEAR = protractor.Key.CONTROL + protractor.Key.END +
    protractor.Key.SHIFT + protractor.Key.HOME +
    protractor.Key.NULL /* Release modifier keys. */ + protractor.Key.DELETE;
export const ENTER = protractor.Key.ENTER;
export const TAB = protractor.Key.TAB;
