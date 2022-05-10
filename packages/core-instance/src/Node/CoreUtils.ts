import type { Axis, IPointAxes } from "@dflex/utils";
import NodeCore from "./Core";
import type { INode } from "./types";

class CoreUtils extends NodeCore implements INode {
  static getRectByAxis(axis: Axis) {
    return axis === "x" ? "width" : "height";
  }

  static getDistance(currentPosition: IPointAxes, elm: INode, axis: Axis) {
    let diff = currentPosition[axis] - elm.currentPosition[axis];

    diff += elm.translate[axis];

    return diff;
  }

  static getDisplacement(currentPosition: IPointAxes, elm: INode, axis: Axis) {
    const diff = axis === "x" ? elm.getRectRight() : elm.getRectBottom();

    return currentPosition[axis] - diff;
  }

  isConnected() {
    return this.ref!.isConnected;
  }

  isPositionedUnder(elmY: number) {
    return elmY <= this.currentPosition.y;
  }

  isPositionedLeft(elmX: number) {
    return elmX <= this.currentPosition.x;
  }

  hasSamePosition(elm: this, axis: Axis) {
    return this.currentPosition[axis] === elm.currentPosition[axis];
  }

  getRectBottom() {
    return this.currentPosition.y + this.offset.height;
  }

  getRectRight() {
    return this.currentPosition.x + this.offset.width;
  }

  getRectDiff(elm: this, axis: Axis) {
    const rectType = CoreUtils.getRectByAxis(axis);

    return this.offset[rectType] - elm.offset[rectType];
  }

  getDisplacement(elm: this, axis: Axis): number {
    return CoreUtils.getDisplacement(this.currentPosition, elm, axis);
  }

  getDistance(elm: this, axis: Axis): number {
    return CoreUtils.getDistance(this.currentPosition, elm, axis);
  }

  getOffset() {
    return {
      width: this.offset.width,
      height: this.offset.height,
      top: this.currentPosition.y,
      left: this.currentPosition.x,
    };
  }
}

export default CoreUtils;
