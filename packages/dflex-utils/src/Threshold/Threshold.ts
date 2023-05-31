/* eslint-disable max-classes-per-file */
import { PointNum } from "../Point";

import type { Axis, Dimensions } from "../types";

import { AbstractBox, BoxBool, BoxNum, AbstractBoxRect } from "../Box";

export interface ThresholdPercentages {
  /** vertical threshold in percentage from 0-100 */
  vertical: number;

  /** horizontal threshold in percentage from 0-100 */
  horizontal: number;
}

class DFlexThreshold {
  readonly thresholds: Record<string, BoxNum>;

  private _pixels!: PointNum;

  private _percentages: ThresholdPercentages;

  isOut: Record<string, BoxBool>;

  constructor(percentages: ThresholdPercentages) {
    this._percentages = percentages;
    this.thresholds = {};
    this.isOut = {};
  }

  private _createPixels({ width, height }: Dimensions): void {
    const x = Math.round((this._percentages.horizontal * width) / 100);
    const y = Math.round((this._percentages.vertical * height) / 100);

    this._pixels = new PointNum(x, y);
  }

  /** Assign threshold property and create new instance for is out indicators */
  private _createThreshold(
    key: string,
    box: AbstractBox,
    isInner: boolean
  ): void {
    if (__DEV__) {
      if (this.thresholds[key] || this.isOut[key]) {
        throw new Error(`Threshold with key: ${key} already exists`);
      }
    }

    this.thresholds[key] = this._pixels.composeBox(box, isInner);

    this.isOut[key] = new BoxBool(false, false, false, false);
  }

  private _setDepthThreshold(key: string, depth: number): void {
    const dp = `${depth}`;

    if (!this.thresholds[dp]) {
      this._createThreshold(dp, this.thresholds[key], false);

      return;
    }

    this.thresholds[depth].assignBiggestBox(this.thresholds[key]);
  }

  /**
   * Set the main threshold for the element based on the element's dimensions
   * and threshold types. For dragged and containers threshold type is outer
   * `isInner=false` and for the rest of the elements `isInner=true.`
   * Note: Duplicate threshold keys will throw an error.
   *
   * @param key
   * @param box
   * @param isInner
   */
  setMainThreshold(key: string, box: AbstractBoxRect, isInner: boolean): void {
    this._createPixels(box);

    this._createThreshold(key, box, isInner);
  }

  /**
   * Update existing threshold with new dimensions.
   *
   * @param key
   * @param rect
   * @param isInner
   */
  updateMainThreshold(key: string, rect: AbstractBox, isInner: boolean): void {
    if (__DEV__) {
      if (!this.thresholds[key]) {
        throw new Error(`Threshold ${key} does not exist.`);
      }
    }

    this.thresholds[key] = this._pixels.composeBox(rect, isInner);

    this.isOut[key].setFalsy();
  }

  getElmMainThreshold(rect: AbstractBox): BoxNum {
    return this._pixels.composeBox(rect, false);
  }

  /**
   * Assign outer threshold for the container. Along with another threshold
   * called insertion threshold which defines the area where the element can be
   * inserted during the migration taking into consideration the biggest hight
   * and width for the depth by using `unifiedContainerDimensions`. And create
   * accumulated depth threshold.
   *
   * @param SK
   * @param childDepth
   * @param containerRect
   * @param unifiedContainerDimensions
   */
  setContainerThreshold(
    SK: string,
    insertionLayerKey: string,
    childDepth: number,
    containerRect: AbstractBox,
    unifiedContainerDimensions: Dimensions
  ): void {
    // Regular threshold.
    this._createThreshold(SK, containerRect, false);

    const { top, left } = containerRect;
    const { height, width } = unifiedContainerDimensions;

    // Insertion threshold.
    this._createThreshold(
      insertionLayerKey,
      {
        left,
        top,
        right: left + width,
        bottom: top + height,
      },
      false
    );

    // Accumulated depth threshold. Accumulation based on insertion layer.
    this._setDepthThreshold(insertionLayerKey, childDepth);
  }

  isOutThreshold(key: string, box: BoxNum, axis: Axis | null): boolean {
    const thresholdBox = this.thresholds[key];

    return box.isOutThreshold(thresholdBox, this.isOut[key], axis);
  }

  destroy(): void {
    Object.keys(this.thresholds).forEach((key) => {
      delete this.thresholds[key];
    });
    Object.keys(this.isOut).forEach((key) => {
      delete this.isOut[key];
    });
  }
}

export default DFlexThreshold;
