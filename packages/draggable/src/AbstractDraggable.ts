/**
 * Copyright (c) Jalal Maskoun.
 *
 * This source code is licensed under the AGPL3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { AbstractCoreInterface } from "@dflex/core-instance";

import type {
  AbstractDraggableInterface,
  DraggedStyle,
  Coordinates,
} from "./types";

class AbstractDraggable<T extends AbstractCoreInterface>
  implements AbstractDraggableInterface<T>
{
  draggedElm: T;

  /**
   * When dragging start, element shouldn't jump from its translate. So, we
   * calculate offset that make translate X,Y start from zero:
   *  goToX = x + this.outerOffsetX.
   *  goToY = y + this.outerOffsetY.
   *
   * goToX and goToY both should be zero with first click. Starts with simple
   * equating: initX = X. Taking into considerations translate value.
   *
   */
  outerOffsetX: number;

  outerOffsetY: number;

  tempTranslate: Coordinates;

  static draggedStyleProps: DraggedStyle = [
    {
      prop: "position",
      dragValue: "relative",
      afterDragValue: null,
    },
    {
      prop: "zIndex",
      dragValue: "99",
      afterDragValue: null,
    },
    {
      prop: "user-select",
      dragValue: "none",
      afterDragValue: null,
    },
  ];

  /**
   * Creates an instance of AbstractDraggable.
   * Works Only on dragged element level.
   *
   * @param abstractCoreElm -
   * @param initCoordinates -
   */
  constructor(abstractCoreElm: T, { x: initX, y: initY }: Coordinates) {
    /**
     * Assign instance for dragged.
     */

    this.draggedElm = abstractCoreElm;

    const { translateX, translateY } = this.draggedElm;

    this.outerOffsetX = -initX + translateX!;
    this.outerOffsetY = -initY + translateY!;

    this.tempTranslate = {
      x: 0,
      y: 0,
    };

    this.setDragged(true);
  }

  /**
   * Triggers twice. Once when constructor is initiated, the other when drag is
   * ended. It adds/removes style.
   *
   * @param isActive - is dragged operation active or it is ended.
   */
  protected setDragged(isActive: boolean) {
    if (isActive) {
      AbstractDraggable.draggedStyleProps.forEach(({ prop, dragValue }) => {
        // TODO: Fix TS error.
        // @ts-expect-error.
        this.draggedElm.ref!.style[prop] = dragValue;
      });

      getSelection()?.removeAllRanges();

      this.draggedElm.ref!.setAttribute("dragged", "true");

      return;
    }
    /**
     * Not active: end of dragging.
     */
    AbstractDraggable.draggedStyleProps.forEach(({ prop, afterDragValue }) => {
      // TODO: Fix TS error.
      // @ts-expect-error.
      this.draggedElm.ref!.style[prop] = afterDragValue;
    });

    this.draggedElm.ref!.removeAttribute("dragged");
  }

  /**
   * Executes dragging by applying transform.
   * Writes to draggedElmCurrentOffset in Transform class.
   * Set values to isDragged flags.
   *
   * @param x - mouse x coordinates
   * @param y - mouse y coordinates
   */
  protected translate(x: number, y: number) {
    /**
     * Calculates translate coordinates.
     *
     * Indicates dragged y-transformation that's will be updated during the
     * dropping process. Updating Y immediately will effect calculations in
     * transform, that's why it is updated when dragging is done.
     */
    this.tempTranslate.x = x + this.outerOffsetX;
    this.tempTranslate.y = y + this.outerOffsetY;

    this.draggedElm.ref!.style.transform = `translate3d(${this.tempTranslate.x}px,${this.tempTranslate.y}px, 0)`;
  }
}

export default AbstractDraggable;
