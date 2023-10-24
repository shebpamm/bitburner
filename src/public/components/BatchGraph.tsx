import React from "react";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

type Props = {};

function receiveEvent(event: any) {
  if (event?.detail?.data?.action === "die") {
    window.removeEventListener("bitburner", receiveEvent);
    return;
  }

  console.log(event);
}

export function BatchGraph({}: Props) {
  useEffect(() => {
    window.addEventListener("bitburner", receiveEvent);

    return () => {};
  });

  useEffect(() => {
    const width = 600;
    const height = 400;
    const margin = { top: 10, bottom: 10, left: 10, right: 10 };

    document.getElementById("batch-graph-svg-wrapper")!.innerHTML = "";

    const svg = d3
      .select("#batch-graph-svg-wrapper")
      .append("svg")
      // .attr("width", width)
      // .attr("height", height)
      .attr("viewbox", `0 0 ${width} ${height}`)
      .append("g");

    // container for focus area
    const container = svg
      .insert("g", "rect.mouse-catch")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("clip-path", "url(#clip)");

    const serieContainer = container.append("g");
    const annotationsContainer = container.append("g");
  });

  return (
    <>
      <div id="batch-graph-svg-wrapper"></div>
    </>
  );
}
