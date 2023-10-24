import { solveWeakenThreads } from "./lib/botnet-utils";
import { NS, Player, Server } from "./types/NetscriptDefinitions";
import { sendEvent } from "./lib/events";
import { v4 } from "uuid";

//millis
const scriptDelay = 300;

const batchDelay = 200;

const t0 = 200;

const weakenCushion = 1.1;

const node = "home";

const moneySlice = 0.5;

const StepTypes = {
  WEAKEN_HACK: Symbol("WH"),
  WEAKEN_GROW: Symbol("WG"),
  HACK: Symbol("H"),
  GROW: Symbol("G"),
};

class BatchStep {
  ns: NS;
  batch: Batch;
  player: Player;
  stepType: Symbol;
  delta: number;
  startTime: number;
  stepDelay: number;
  stepDuration: number;
  threads: number;
  timeFormula: Function;
  executionTime: number;
  finishTime: number;
  expIncrease: number;

  constructor(batch: Batch, type: Symbol, delay: number) {
    this.ns = batch.ns;
    this.batch = batch;
    this.player = JSON.parse(JSON.stringify(batch.player)); // Deep copy of the player, see if this has performance implications
    this.stepType = type;
    this.delta = this.getStepDelta(type);
    this.startTime = Date.now(); //Used for debugging
    this.stepDelay = delay;
  }

  static async build(batch: Batch, type: Symbol, delay: number) {
    const batchStep = new BatchStep(batch, type, delay);
    await batchStep.initialize();

    return batchStep;
  }

  solveWeakenThreads(securityDecrease: number) {
    let analyzeResult = 0;
    let threadCount = 0;
    while (analyzeResult - securityDecrease < 1) {
      threadCount++;
      analyzeResult = this.ns.weakenAnalyze(threadCount);
    }
    return threadCount;
  }

  async scheduleStep() {
    if (!this.threads || this.threads < 1) {
      this.ns.print("Something went fucky, here's me: ", this);
      return;
    }

    if (this.stepDelay) {
      await this.ns.asleep(this.stepDelay);
    }

    let scriptPath: string;
    switch (this.stepType) {
      case StepTypes.WEAKEN_HACK:
        scriptPath = "/execs/weak.js";
        break;
      case StepTypes.WEAKEN_GROW:
        scriptPath = "/execs/weak.js";
        break;
      case StepTypes.HACK:
        scriptPath = "/execs/hack.js";
        break;
      case StepTypes.GROW:
        scriptPath = "/execs/grow.js";
        break;
    }

    const pid = this.ns.exec(
      scriptPath,
      node,
      Math.floor(this.threads),
      this.batch.targetServer.hostname,
      this.batch.spawnTime,
      this.delta,
    );

    sendEvent({
      uuid: v4(),
      data: {
        action: "exec",
        step: this,
      },
    });

    this.batch.pids.push(pid);
  }

  /*
      Delta is the percieved order of the steps relative to the WEAKEN_HACK step.
      So the order is as following:
      -1 HACK
      0 WEAKEN
      1 GROW
      2 WEAKEN

      As WEAKEN_HACK needs to be executed first, we use it as a frame of reference.
  */
  getStepDelta(type: Symbol): 0 | 1 | -1 | 2 {
    switch (type) {
      case StepTypes.WEAKEN_HACK:
        return 0;

      case StepTypes.HACK:
        return -1;

      case StepTypes.GROW:
        return 1;

      case StepTypes.WEAKEN_GROW:
        return 2;
      default:
        return 0;
    }
  }

  getNeededHackThreads() {
    const threadPercent = this.ns.formulas.hacking.hackPercent(
      this.batch.targetServer,
      this.player,
    );

    return moneySlice / threadPercent;
  }

  getHackSecurityIncrease() {
    return this.ns.hackAnalyzeSecurity(this.getNeededHackThreads());
  }

  getNeededGrowThreads() {
    const growPercent = 1 / (1 - moneySlice);
    return Math.ceil(
      this.ns.growthAnalyze(this.batch.targetServer.hostname, growPercent),
    );
  }

  getGrowSecurityIncrease() {
    return this.ns.growthAnalyzeSecurity(this.getNeededGrowThreads());
  }

  getExecutionDelay(delta: number) {
    return (
      this.batch.steps.WH.stepDuration - this.stepDuration + scriptDelay * delta
    );
  }

  increaseHackingExp(additionalExp: number) {
    const expNeeded = this.ns.formulas.skills.calculateExp(
      this.player.skills.hacking + 1,
      this.player.mults.hacking,
    );
    this.player.exp.hacking += additionalExp;

    if (this.player.exp.hacking > expNeeded) {
      this.player.skills.hacking += 1;
    }
  }

  getStepDuration() {
    return this.timeFormula(this.batch.targetServer, this.player);
  }

  // calculateStepExecutionTime() {
  //   return;
  //
  //   let previousHackingLevel;
  //   let previousExecutionTime = this.batch.spawnTime;
  //
  //   do {
  //     this.stepDuration = this.timeFormula(
  //       this.batch.targetServer,
  //       this.player,
  //     );
  //     this.stepDelay = this.getExecutionDelay(this.delta); // Run hack before the first weaken
  //     this.executionTime = this.batch.spawnTime + this.stepDelay;
  //
  //     previousHackingLevel = this.player.skills.hacking;
  //     const totalExpIncrease = this.batch.parallelBatches.reduce(
  //       (sum, batch) =>
  //         sum +
  //         batch.getExpIncreaseBetween(
  //           previousExecutionTime,
  //           this.executionTime,
  //         ),
  //       0,
  //     );
  //
  //     this.increaseHackingExp(totalExpIncrease);
  //
  //     previousExecutionTime = this.executionTime;
  //   } while (false); //Do not do exp calculations ahead of time
  //   //} while (this.player.hacking > previousHackingLevel)
  //
  //   this.finishTime = this.executionTime + this.stepDuration;
  //
  //   //this.ns.print([`----- ${this.delta} -----`, this.stepDuration, this.stepDelay, this.executionTime, this.finishTime, "----------"].join("\n"));
  // }

  async processWeakenHack() {
    //this.stepDuration = this.getStepDuration()
    // this.stepDelay = 0;
    // this.executionTime = this.batch.spawnTime;
    // this.finishTime = this.executionTime + this.stepDuration;

    this.threads =
      solveWeakenThreads(this.ns, this.getHackSecurityIncrease()) *
      weakenCushion;
    await this.scheduleStep();
  }

  async processHack() {
    //this.calculateStepExecutionTime();

    this.threads = this.getNeededHackThreads();
    await this.scheduleStep();
  }

  async processGrow() {
    //this.calculateStepExecutionTime();

    this.threads = this.getNeededGrowThreads();
    await this.scheduleStep();
  }

  async processWeakenGrow() {
    //this.calculateStepExecutionTime();

    this.threads =
      solveWeakenThreads(this.ns, this.getGrowSecurityIncrease()) *
      weakenCushion;
    await this.scheduleStep();
  }

  async initialize() {
    switch (this.stepType) {
      case StepTypes.WEAKEN_HACK:
        this.timeFormula = this.ns.formulas.hacking.weakenTime;
        await this.processWeakenHack();
        break;

      case StepTypes.HACK:
        this.timeFormula = this.ns.formulas.hacking.hackTime;
        await this.processHack();
        break;

      case StepTypes.GROW:
        this.timeFormula = this.ns.formulas.hacking.growTime;
        await this.processGrow();
        break;

      case StepTypes.WEAKEN_GROW:
        this.timeFormula = this.ns.formulas.hacking.weakenTime;
        await this.processWeakenGrow();
        break;
    }
  }
}

type StepCollection = {
  WH: BatchStep | undefined;
  H: BatchStep | undefined;
  G: BatchStep | undefined;
  WG: BatchStep | undefined;
};

class Batch {
  ns: NS;
  player: Player;
  targetServer: Server;
  spawnTime: number;
  timings: number[];
  steps: StepCollection;
  pids: number[];
  finishTime: number;

  constructor(ns: NS, targetServer: Server, timings: number[]) {
    this.ns = ns;
    this.player = this.ns.getPlayer();
    this.targetServer = targetServer;
    this.spawnTime = Date.now();
    this.timings = timings;
    this.steps = { WH: undefined, H: undefined, G: undefined, WG: undefined };
    this.pids = [];

    /*
    this.targetServer.hackDifficulty = this.targetServer.minDifficulty;
    this.targetServer.moneyAvailable = this.targetServer.moneyMax;
    */
  }

  static async build(ns: NS, targetServer: Server, timings: number[]) {
    const batch = new Batch(ns, targetServer, timings);
    await batch.initialize();

    return batch;
  }

  getTargetMoneySlice() {
    return this.targetServer.moneyMax * moneySlice;
  }

  getExpIncreaseBetween(start: number, end: number) {
    return Object.values(this.steps)
      .filter((step) => start < step.finishTime && step.finishTime < end)
      .reduce((sum, step) => sum + step.expIncrease, 0);
  }

  async initialize() {
    const promises = [];
    promises.push(
      BatchStep.build(this, StepTypes.WEAKEN_HACK, this.timings[-1]).then(
        (step) => (this.steps.WH = step),
      ),
    );

    promises.push(
      BatchStep.build(this, StepTypes.HACK, this.timings[0]).then(
        (step) => (this.steps.H = step),
      ),
    );

    promises.push(
      BatchStep.build(this, StepTypes.GROW, this.timings[1]).then(
        (step) => (this.steps.G = step),
      ),
    );

    promises.push(
      BatchStep.build(this, StepTypes.WEAKEN_GROW, this.timings[2]).then(
        (step) => (this.steps.WG = step),
      ),
    );

    await Promise.all(promises);
  }
}

class BatchScheduler {
  ns: NS;
  targetServer: Server;
  batchDelay: number;
  scriptDelay: number;
  batches: Batch[];
  times: number[];
  period: number;
  depth: number;
  fishDelays: number[];

  constructor(
    ns: NS,
    targetServer: Server,
    batchDelay: number,
    scriptDelay: number,
  ) {
    this.ns = ns;
    this.targetServer = targetServer;
    this.batchDelay = batchDelay;
    this.scriptDelay = scriptDelay;
    this.batches = [];
    this.times = [];
  }

  //Untrack any batches that have finished
  cleanBatches() {
    this.batches = this.batches.filter((batch) => {
      return batch.finishTime > Date.now();
    });
  }

  async waitPids(pids: number[]) {
    for (;;) {
      let stillRunning = false;
      for (var pid of pids) {
        const process = this.ns.getRunningScript(pid);
        if (process != undefined) {
          stillRunning = true;
          break;
        }
        await this.ns.sleep(0);
      }
      if (!stillRunning) return;
      await this.ns.asleep(5);
    }
  }

  // Based on stalefish method
  getFishDelay() {
    // Figure hack time and threads
    const so = this.ns.getServer(this.targetServer.hostname);
    const player = this.ns.getPlayer();

    // Set server to min difficulty, it's the state where all 4 ops start at
    so.hackDifficulty = so.minDifficulty;

    // Get the times, those are fixed since we start at X security
    this.times[-1] = this.ns.formulas.hacking.hackTime(so, player);
    this.times[0] = this.ns.formulas.hacking.weakenTime(so, player);
    this.times[1] = this.ns.formulas.hacking.growTime(so, player);
    this.times[2] = this.ns.formulas.hacking.weakenTime(so, player);

    this.period = 0;
    this.depth = 0;

    const kW_max = Math.min(
      Math.floor(1 + (this.times[0] - 4 * t0) / (8 * t0)),
      4,
    );
    schedule: for (let kW = kW_max; kW >= 1; --kW) {
      const t_min_W = (this.times[0] + 4 * t0) / kW;
      const t_max_W = (this.times[0] - 4 * t0) / (kW - 1);
      const kG_min = Math.ceil(Math.max((kW - 1) * 0.8, 1));
      const kG_max = Math.floor(1 + kW * 0.8);
      for (let kG = kG_max; kG >= kG_min; --kG) {
        const t_min_G = (this.times[1] + 3 * t0) / kG;
        const t_max_G = (this.times[1] - 3 * t0) / (kG - 1);
        const kH_min = Math.ceil(
          Math.max((kW - 1) * 0.25, (kG - 1) * 0.3125, 1),
        );
        const kH_max = Math.floor(Math.min(1 + kW * 0.25, 1 + kG * 0.3125));
        for (let kH = kH_max; kH >= kH_min; --kH) {
          const t_min_H = (this.times[-1] + 5 * t0) / kH;
          const t_max_H = (this.times[-1] - 1 * t0) / (kH - 1);
          const t_min = Math.max(t_min_H, t_min_G, t_min_W);
          const t_max = Math.min(t_max_H, t_max_G, t_max_W);
          if (t_min <= t_max) {
            this.period = Math.round(t_min);
            this.depth = Math.floor(kW);
            break schedule;
          }
        }
      }
    }

    this.fishDelays = [];
    this.fishDelays[-1] = Math.round(
      this.depth * this.period - 4 * t0 - this.times[-1],
    );
    this.fishDelays[0] = Math.round(
      this.depth * this.period - 3 * t0 - this.times[0],
    );
    this.fishDelays[1] = Math.round(
      this.depth * this.period - 2 * t0 - this.times[1],
    );
    this.fishDelays[2] = Math.round(
      this.depth * this.period - 1 * t0 - this.times[2],
    );
  }

  // Main process
  async run() {
    while (true) {
      this.getFishDelay();
      let pids = [];
      for (let i = 0; i < this.depth; i++) {
        const batch = await Batch.build(
          this.ns,
          this.targetServer,
          this.fishDelays,
        );
        pids.push(...batch.pids);
        await this.ns.asleep(t0);
      }
      this.ns.print("Spawned new cycle.");
      this.ns.print("Waiting for pids: ", pids);
      await this.waitPids(pids);
    }
  }
}

export async function initBatching(ns: NS) {
  const targetHost = ns.args[0].toString();
  const targetServer = ns.getServer(targetHost);
  const batchScheduler = new BatchScheduler(
    ns,
    targetServer,
    batchDelay,
    scriptDelay,
  );

  ns.disableLog("asleep"); // Disable asleep logging, as we sleep a ton
  ns.disableLog("sleep"); // Disable sleep logging, as we sleep a ton

  await batchScheduler.run();
}
