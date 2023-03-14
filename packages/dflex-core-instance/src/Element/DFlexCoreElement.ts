/* eslint-disable no-underscore-dangle */
import {
  BoxRect,
  BoxRectAbstract,
  featureFlags,
  PointNum,
  assertElementPosition,
  getElmComputedDimensions,
  BOTH_AXIS,
} from "@dflex/utils";
import type { Direction, Axes, AxesPoint } from "@dflex/utils";

import DFlexBaseElement from "./DFlexBaseElement";

export type DFlexSerializedElement = {
  type: string;
  version: 3;
  id: string;
  translate: PointNum | null;
  grid: PointNum;
  order: DFlexDOMGenOrder;
  initialPosition: AxesPoint;
  rect: BoxRectAbstract;
  hasTransformedFromOrigin: boolean;
  hasPendingTransformation: boolean;
  isVisible: boolean;
};

type TransitionHistory = {
  ID: string;
  axis: Axes;
  translate: AxesPoint;
};

/**
 * Element unique keys in DOM tree.
 */
export interface Keys {
  BK: string;
  SK: string;
  PK: string;
  CHK: string | null;
}

/**
 * Element order in its branch & higher branch
 */
export interface DFlexDOMGenOrder {
  self: number;
  parent: number;
}

export interface DFlexElementInput {
  id: string;
  order: DFlexDOMGenOrder;
  keys: Keys;
  depth: number;
  readonly: boolean;
}

function resetDOMStyle(DOM: HTMLElement): void {
  DOM.style.removeProperty("transform");

  if (!DOM.getAttribute("style")) {
    DOM.removeAttribute("style");
  }
}

class DFlexCoreElement extends DFlexBaseElement {
  private _initialPosition: PointNum;

  rect: BoxRect;

  private _computedDimensions: PointNum | null;

  // margin: BoxRect | null;

  VDOMOrder: DFlexDOMGenOrder;

  DOMOrder: DFlexDOMGenOrder;

  keys: Keys;

  depth: number;

  DOMGrid: PointNum;

  isVisible: boolean;

  hasPendingTransform: boolean;

  readonly: boolean;

  animatedFrame: number | null;

  private _translateHistory?: TransitionHistory[];

  static getType(): string {
    return "core:element";
  }

  static transform = DFlexBaseElement.transform;

  constructor(eleWithPointer: DFlexElementInput) {
    const { order, keys, depth, readonly, id } = eleWithPointer;

    super(id);

    this.VDOMOrder = Object.seal({ ...order });
    this.DOMOrder = Object.seal({ ...order });
    this.keys = Object.seal({ ...keys });
    this.depth = depth;
    this.readonly = readonly;
    this.isPaused = false;
    this.isVisible = !this.isPaused;
    this.animatedFrame = null;
    this.hasPendingTransform = false;

    // CSS
    this._computedDimensions = null;
    // this.margin = null;
    this._initialPosition = new PointNum(0, 0);
    this.rect = new BoxRect(0, 0, 0, 0);
    this.DOMGrid = new PointNum(0, 0);
  }

  initElmRect(DOM: HTMLElement): void {
    const { height, width, left, top } = DOM.getBoundingClientRect();

    /**
     * Element offset stored once without being triggered to re-calculate.
     * Instead, using currentOffset object as indicator to current
     * offset/position. This offset, is the init-offset.
     */
    this._initialPosition.setAxes(left, top);

    this.rect.setByPointAndDimensions(top, left, height, width);
  }

  getDimensions(DOM: HTMLElement): PointNum {
    if (this._computedDimensions) {
      return this._computedDimensions;
    }

    const { width, height } = getElmComputedDimensions(DOM);

    this._computedDimensions = new PointNum(width, height);

    return this._computedDimensions;
  }

  // getMargin(DOM: HTMLElement): BoxRect {
  //   if (this.margin) {
  //     return this.margin;
  //   }

  //   const { width, height } = getElmComputedDimensions(DOM);

  //   this.margin = new BoxRect(width, height, height, height);

  //   return this.margin;
  // }

  getInitialPosition(): PointNum {
    return this._initialPosition;
  }

  resume(DOM: HTMLElement): void {
    this.initTranslate();
    this.initElmRect(DOM);
  }

  changeVisibility(DOM: HTMLElement, isVisible: boolean): void {
    if (isVisible === this.isVisible) {
      return;
    }

    this.isVisible = isVisible;

    if (this.hasPendingTransform && this.isVisible) {
      this._transform(DOM);
      this.hasPendingTransform = false;
    }
  }

  private _transform(DOM: HTMLElement, cb?: () => void): void {
    if (this.animatedFrame !== null) {
      cancelAnimationFrame(this.animatedFrame);
    }

    this.animatedFrame = requestAnimationFrame(() => {
      DFlexCoreElement.transform(DOM, this.translate.x, this.translate.y);

      if (this.hasPendingTransform) {
        this.hasPendingTransform = false;
      }

      if (cb) {
        cb();
      }

      this.animatedFrame = null;
    });
  }

  updateIndex(DOM: HTMLElement, i: number) {
    this.setAttribute(DOM, "INDEX", i);
    this.VDOMOrder.self = i;

    if (__DEV__) {
      DOM.dataset.x = `${this.DOMGrid.x}`;
      DOM.dataset.y = `${this.DOMGrid.y}`;
    }
  }

  assignNewIndex(branchIDsOrder: string[], newIndex: number): void {
    if (newIndex < 0 || newIndex > branchIDsOrder.length - 1) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error(
          `Illegal Attempt: Received an index:${newIndex} on siblings list:${
            branchIDsOrder.length - 1
          }.\n`
        );
      }

      return;
    }

    if (branchIDsOrder[newIndex].length > 0) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error(
          "Illegal Attempt: Colliding in positions.\n",
          `Element id: ${this.id}\n`,
          `Collided at index: ${newIndex}\n`,
          `Siblings list: ${branchIDsOrder}\n`
        );
      }

      return;
    }

    branchIDsOrder[newIndex] = this.id;
  }

  private _leaveToNewIndex(
    branchIDsOrder: string[],
    newIndex: number,
    oldIndex: number
  ): void {
    branchIDsOrder[oldIndex] = "";

    branchIDsOrder[newIndex] = this.id;
  }

  private _pushToTranslateHistory(axis: Axes, operationID: string) {
    const translate = this.translate.getInstance();

    const elmAxesHistory: TransitionHistory = {
      ID: operationID,
      axis,
      translate,
    };

    if (!Array.isArray(this._translateHistory)) {
      this._translateHistory = [];
    }

    this._translateHistory.push(elmAxesHistory);
  }

  private _transformOrPend(
    DOM: HTMLElement,
    hasToFlushTransform: boolean
  ): void {
    if (hasToFlushTransform) {
      if (!this.isVisible && this.hasPendingTransform) {
        this.hasPendingTransform = false;

        return;
      }

      this._transform(DOM);

      return;
    }

    if (!this.isVisible) {
      this.hasPendingTransform = true;

      return;
    }

    this._transform(DOM);
  }

  private _transformationProcess(
    DOM: HTMLElement,
    newPos: AxesPoint,
    hasToFlushTransform: boolean,
    increment: number
  ) {
    this.translate.increase(newPos);

    /**
     * This offset related directly to translate Y and Y. It's isolated from
     * element current offset and effects only top and left.
     */
    this.rect.setAxes(
      this._initialPosition.x + this.translate.x,
      this._initialPosition.y + this.translate.y
    );

    this._transformOrPend(DOM, hasToFlushTransform);

    const { self: oldIndex } = this.VDOMOrder;

    const newIndex = oldIndex + increment;

    this.updateIndex(DOM, newIndex);

    return { oldIndex, newIndex };
  }

  /**
   *
   * @param DOM
   * @param siblings
   * @param mainAxisDirection
   * @param elmPos
   * @param operationID
   * @param axis
   */
  reconcilePosition(
    axis: Axes,
    mainAxisDirection: Direction,
    DOM: HTMLElement,
    siblings: string[],
    elmPos: PointNum,
    operationID: string
  ): void {
    const numberOfPassedElm = 1;

    /**
     * `mainAxisDirection` decides the direction of the element, negative or positive.
     * If the element is dragged to the left, the `mainAxisDirection` is -1.
     */
    if (axis === "z") {
      BOTH_AXIS.forEach((_axis, i) => {
        // i=0 for `X` which is the opposite of the main axis(`Y`) when dragging on `Z`
        const direction =
          i === 0 ? (mainAxisDirection === 1 ? -1 : 1) : mainAxisDirection;

        elmPos[_axis] *= direction;

        this.DOMGrid[_axis] += mainAxisDirection * numberOfPassedElm;
      });
    } else {
      elmPos[axis] *= mainAxisDirection;

      this.DOMGrid[axis] += mainAxisDirection * numberOfPassedElm;
    }

    this._pushToTranslateHistory(axis, operationID);

    const { oldIndex, newIndex } = this._transformationProcess(
      DOM,
      elmPos,
      false,
      mainAxisDirection * numberOfPassedElm
    );

    this._leaveToNewIndex(siblings, newIndex, oldIndex);

    if (__DEV__) {
      if (featureFlags.enablePositionAssertion) {
        if (!this.hasPendingTransform) {
          setTimeout(() => {
            assertElementPosition(DOM, this.rect);
          }, 1000);
        }
      }
    }
  }

  restorePosition(DOM: HTMLElement): void {
    this._transform(DOM);

    this.setAttribute(DOM, "INDEX", this.VDOMOrder.self);
  }

  assignNewPosition(DOM: HTMLElement, t: PointNum): void {
    this.translate.clone(t);
    this._transform(DOM);
  }

  /**
   * Roll back element position.
   *
   * @param cycleID
   */
  rollBackPosition(DOM: HTMLElement, cycleID: string): void {
    if (!Array.isArray(this._translateHistory)) {
      return;
    }

    const { length } = this._translateHistory;

    const stillInSameCycle = this._translateHistory[length - 1].ID === cycleID;

    if (!stillInSameCycle) {
      return;
    }

    const { translate: preTranslate, axis } = this._translateHistory.pop()!;

    const elmPos = {
      x: preTranslate.x - this.translate.x,
      y: preTranslate.y - this.translate.y,
    };

    let increment = 0;

    if (axis === "z") {
      increment = elmPos.x > 0 || elmPos.y > 0 ? 1 : -1;

      this.DOMGrid.increase({ x: increment, y: increment });
    } else {
      increment = elmPos[axis] > 0 ? 1 : -1;

      this.DOMGrid[axis] += increment;
    }

    this._transformationProcess(DOM, elmPos, true, increment);

    if (this._translateHistory.length === 0) {
      this._translateHistory = undefined;
      return;
    }

    this.rollBackPosition(DOM, cycleID);
  }

  hasTransformedFromOrigin(): boolean {
    return this._initialPosition.isNotEqual(this.rect.left, this.rect.top);
  }

  needDOMReconciliation(): boolean {
    return this.VDOMOrder.self !== this.DOMOrder.self;
  }

  refreshIndicators(DOM: HTMLElement): void {
    this._translateHistory = undefined;

    this.translate.setAxes(0, 0);

    this.hasPendingTransform = false;

    this.DOMOrder.self = this.VDOMOrder.self;

    resetDOMStyle(DOM);

    this.initElmRect(DOM);

    this.DOMGrid.setAxes(0, 0);
  }

  getSerializedInstance(): DFlexSerializedElement {
    return {
      type: DFlexCoreElement.getType(),
      version: 3,
      id: this.id,
      grid: this.DOMGrid,
      translate: this.translate instanceof PointNum ? this.translate : null,
      order: this.VDOMOrder,
      initialPosition: this._initialPosition.getInstance(),
      rect: this.rect.getRect(),
      hasTransformedFromOrigin: this.hasTransformedFromOrigin(),
      hasPendingTransformation: this.hasPendingTransform,
      isVisible: this.isVisible,
    };
  }
}

export default DFlexCoreElement;