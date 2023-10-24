import * as d3 from "d3";

export default class Timeline {
  private width: number;
  private height: number;
  private margin: { top: number; bottom: number; left: number; right: number };

  private element: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, any>;

  constructor(element: HTMLElement) {
    this.width = 600;
    this.height = 400;
    this.margin = { top: 10, bottom: 10, left: 10, right: 10 };

    this.element = element;
    this.svg = d3.select(element).append("svg");

    this.create();
  }

  private create() {
    const svg = this.svg
      .append("svg")
      // .attr("width", width)
      // .attr("height", height)
      .attr("viewbox", `0 0 ${this.width} ${height}`)
      .append("g");

    // container for focus area
    const container = svg
      .insert("g", "rect.mouse-catch")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("clip-path", "url(#clip)");

    const serieContainer = container.append("g");
    const annotationsContainer = container.append("g");
  }
}
