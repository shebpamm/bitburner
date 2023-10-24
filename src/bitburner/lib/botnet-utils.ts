import { NS, } from "../types/NetscriptDefinitions";

export function solveWeakenThreads(ns: NS, securityDecrease: number) {
  let analyzeResult = 0;
  let threadCount = 0;
  while (analyzeResult - securityDecrease < 1) {
    threadCount++;
    analyzeResult = ns.weakenAnalyze(threadCount);
  }
  return threadCount;
}

// TODO: Port swarm to ts
export async function distributeScript(ns: NS, swarm: any, threads: number, scriptPath: string, args: (string | number | boolean)[]) {
  threads = Math.ceil(threads);

  let threadIndex = 0;
  let hostIndex = 0;
  let scriptCost = ns.getScriptRam(scriptPath);

  while (threadIndex < threads) {
    await swarm.enumerateServers(); //Force refresh of stats

    let server = swarm.servers[hostIndex];

    if (server.maxRam - server.ramUsed < scriptCost) {
      while (server.maxRam - server.ramUsed < scriptCost) {
        hostIndex++;
        if (hostIndex < swarm.servers.length) server = swarm.servers[hostIndex];
        else {
          throw "No memory left in swarm";
        }
      }
    }

    let threadCount = Math.floor((server.maxRam - server.ramUsed) / scriptCost);

    if (threadCount >= threads - threadIndex) {
      threadCount = threads - threadIndex;
    }

    ns.scp(scriptPath, server.hostname);
    ns.exec(scriptPath, server.hostname, threadCount, ...args);

    threadIndex += threadCount;
  }
}
