import * as d3 from "d3";

export default class Timeline {
  private width: number;
  private height: number;
  private margin: { top: number; bottom: number; left: number; right: number };

  private container: HTMLElement;

  constructor(element: HTMLElement) {
    this.width = 600;
    this.height = 400;
    this.margin = { top: 10, bottom: 10, left: 10, right: 10 };

    this.container = element;

    this.create();
  }

  private responsivefy(svg: d3.Selection<SVGSVGElement, unknown, null, any>) {
    // get container + svg aspect ratio
     const width = parseInt(svg.style("width"));
     const height = parseInt(svg.style("height"));
     const aspect = width / height;
     const container = d3.select(svg.node().parentNode);

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "xMinYMid")
      .call(resize);

    const observer = new window.ResizeObserver(resize);

    const target = container.node();

    if (!target) {
      console.error("Could not find react-resizeble for window");
      return;
    }

    observer.observe(target);

    // get width of container and resize svg to fit it
    function resize() {
      const targetWidth = container.node().getBoundingClientRect().width;
      svg.attr("width", targetWidth);
      svg.attr("height", Math.round(targetWidth / aspect));
    }
  }

  private create() {
    const svg = d3
      .select(this.container)
      .append("svg")
      .attr("width", this.width - this.margin.bottom - this.margin.top)
      .attr("height", this.height - this.margin.left - this.margin.right)
      .call(this.responsivefy)

    // container for focus area
    const container = svg
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`)

    let x = d3.scaleLinear()
      .domain([0, 100])
      .range([0, this.width]);

    svg.append("g")
      .attr("transform", `translate(0,${this.height})`)
      .attr("stroke", "white")
      .call(d3.axisTop(x));
  }
}
