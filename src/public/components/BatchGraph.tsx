import React from "react";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Timeline from '../lib/Timeline';
import '@/style/BatchGraph.css';

type Props = {};

function receiveEvent(event: any) {
  if (event?.detail?.data?.action === "die") {
    window.removeEventListener("bitburner", receiveEvent);
    return;
  }

  // console.log(event);
}

export function BatchGraph({}: Props) {
  useEffect(() => {
    window.addEventListener("bitburner", receiveEvent);

    return () => {};
  });

  useEffect(() => {
    let container = document.getElementById("batch-graph-svg-wrapper");
    if (container === null) {
      console.log("Could not find container");
      return;
    }

    let timeline = new Timeline(container);

  });

  return (
    <>
      <div id="batch-graph-svg-wrapper"></div>
    </>
  );
}
