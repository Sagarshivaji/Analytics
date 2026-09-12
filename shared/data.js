/*
 * BenchData — shared mock dataset for all 6 analytics prototypes.
 * Deterministic (seeded RNG) so every prototype page renders the same
 * underlying numbers, as if reading from one backend.
 */
(function (global) {
  "use strict";

  // ---------- seeded RNG (mulberry32) ----------
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260912);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const weightedPick = (pairs) => {
    // pairs: [[value, weight], ...]
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const [v, w] of pairs) {
      if (r < w) return v;
      r -= w;
    }
    return pairs[pairs.length - 1][0];
  };
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  // ---------- reference date ----------
  const TODAY = new Date(2026, 8, 12); // Sep 12, 2026 — matches "current" period used across prototypes
  const HISTORY_START = new Date(2024, 8, 1); // Sep 1, 2024 — 24 months of history

  // ---------- reference entities ----------
  const RECRUITERS = [
    { id: "r1", name: "Rahul Sharma" },
    { id: "r2", name: "Priya Menon" },
    { id: "r3", name: "Amit Verma" },
    { id: "r4", name: "Sarah Chen" },
    { id: "r5", name: "Mike Johnson" },
    { id: "r6", name: "Lisa Wong" },
  ];

  const PLATFORMS = [
    { id: "p1", name: "Dice" },
    { id: "p2", name: "LinkedIn" },
    { id: "p3", name: "Indeed" },
    { id: "p4", name: "Monster" },
    { id: "p5", name: "CareerBuilder" },
  ];

  const ROLES = [
    { id: "role1", name: "Java Developer", tech: "Java" },
    { id: "role2", name: "Data Engineer", tech: "Data Engineering" },
    { id: "role3", name: "DevOps Engineer", tech: "DevOps" },
    { id: "role4", name: ".NET Developer", tech: ".NET" },
    { id: "role5", name: "Full Stack Developer", tech: "React/Node" },
    { id: "role6", name: "QA Engineer", tech: "QA Automation" },
    { id: "role7", name: "Business Analyst", tech: "Business Analysis" },
    { id: "role8", name: "Cloud Architect", tech: "AWS/Azure" },
  ];

  const LOCATIONS = ["Texas", "New Jersey", "California", "Illinois", "New York", "Florida", "Remote", "Georgia"];

  const CLIENTS = [
    { id: "c1", name: "Nova Systems" },
    { id: "c2", name: "Vertex Health" },
    { id: "c3", name: "Bridgeline Corp" },
    { id: "c4", name: "Meridian Bank" },
    { id: "c5", name: "Orion Retail" },
    { id: "c6", name: "Falcon Logistics" },
    { id: "c7", name: "Summit Insurance" },
    { id: "c8", name: "Cascade Technologies" },
    { id: "c9", name: "Anchor Financial" },
    { id: "c10", name: "Pinnacle Manufacturing" },
  ];

  const FIRST_NAMES = ["John","Sarah","Michael","David","Robert","Emily","James","Linda","William","Jennifer","Richard","Patricia","Joseph","Karen","Thomas","Nancy","Charles","Susan","Daniel","Jessica","Matthew","Ashley","Anthony","Amanda","Mark","Melissa","Steven","Rebecca","Paul","Laura","Andrew","Kimberly","Kevin","Michelle","Brian","Amy","George","Angela","Edward","Stephanie","Ryan","Nicole","Jacob","Samantha","Gary","Rachel","Nicholas","Katherine","Eric","Christine"];
  const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Garcia","Rodriguez","Wilson","Martinez","Anderson","Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lopez","Lee","Gonzalez","Harris","Clark","Lewis","Robinson","Walker","Perez","Hall","Young","Allen","Sanchez","Wright","King","Scott","Green","Baker","Adams","Nelson"];

  const usedNames = new Set();
  function uniqueName() {
    let name;
    do {
      name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);
    return name;
  }

  // ---------- candidates ----------
  const CANDIDATE_COUNT = 165;
  const CANDIDATES = [];
  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    const role = pick(ROLES);
    const benchStart = addDays(HISTORY_START, randInt(0, 700));
    CANDIDATES.push({
      id: "cand" + (i + 1),
      name: uniqueName(),
      roleId: role.id,
      role: role.name,
      technology: role.tech,
      location: pick(LOCATIONS),
      recruiterId: pick(RECRUITERS).id,
      benchStartDate: benchStart,
      rate: randInt(55, 110),
    });
  }
  const candidateById = Object.fromEntries(CANDIDATES.map((c) => [c.id, c]));

  // ---------- submissions + derived funnel ----------
  // Funnel stage order; each submission progresses to a max stage, then may
  // terminate as Rejected/Withdrawn instead of continuing.
  const STAGE_ORDER = ["Submitted", "Response", "Interview", "Offer", "Placed"];

  const SUBMISSIONS = [];
  const INTERVIEWS = [];
  const OFFERS = [];
  const RATE_CONFIRMATIONS = [];
  const PLACEMENTS = [];

  let subSeq = 1, intSeq = 1, offSeq = 1, rcSeq = 1, plcSeq = 1;

  // Iterate month by month from HISTORY_START to TODAY, generating a
  // realistic, gently-growing volume of submissions with seasonality.
  const months = [];
  {
    let cur = new Date(HISTORY_START);
    while (cur <= TODAY) {
      months.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  months.forEach((monthStart, idx) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    // growth trend: ~2.2% MoM compounding, plus mild seasonality dip in Dec/Jan
    const base = 300;
    const growth = Math.pow(1.022, idx);
    const monthNum = monthStart.getMonth();
    const seasonal = monthNum === 11 || monthNum === 0 ? 0.78 : monthNum === 6 ? 0.9 : 1;
    const noise = 0.9 + rand() * 0.2;
    const target = Math.round(base * growth * seasonal * noise);

    for (let i = 0; i < target; i++) {
      const candidate = pick(CANDIDATES);
      // Only candidates already on bench at time of submission
      if (candidate.benchStartDate > monthEnd) continue;
      const day = randInt(1, Math.min(daysInMonth, 28));
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (date > TODAY) continue;

      const platform = weightedPick([
        [PLATFORMS[0], 33], [PLATFORMS[1], 30], [PLATFORMS[2], 20], [PLATFORMS[3], 11], [PLATFORMS[4], 6],
      ]);
      const client = pick(CLIENTS);

      // funnel progression probabilities
      let stageIdx = 0; // Submitted
      let terminal = null;
      if (rand() < 0.36) {
        stageIdx = 1; // Response
        if (rand() < 0.40) {
          stageIdx = 2; // Interview
          if (rand() < 0.18) {
            stageIdx = 3; // Offer
            if (rand() < 0.79) {
              stageIdx = 4; // Placed
            } else {
              terminal = "Rejected";
            }
          } else if (rand() < 0.5) {
            terminal = "Rejected";
          }
        } else if (rand() < 0.3) {
          terminal = "Rejected";
        }
      } else if (rand() < 0.08) {
        terminal = "Withdrawn";
      }

      const submission = {
        id: "sub" + subSeq++,
        candidateId: candidate.id,
        recruiterId: candidate.recruiterId,
        platformId: platform.id,
        roleId: candidate.roleId,
        clientId: client.id,
        date,
        stage: terminal || STAGE_ORDER[stageIdx],
        stageIndex: stageIdx,
        terminal: !!terminal,
        rate: candidate.rate + randInt(-5, 5),
      };
      SUBMISSIONS.push(submission);

      // Interview record(s)
      if (stageIdx >= 2) {
        const rounds = stageIdx >= 3 ? randInt(2, 3) : 1;
        for (let rd = 1; rd <= rounds; rd++) {
          const intDate = addDays(date, randInt(5, 14) * rd);
          if (intDate > TODAY) continue;
          let outcome;
          if (rd < rounds) outcome = "Passed";
          else if (stageIdx >= 3) outcome = "Passed";
          else outcome = weightedPick([["Failed", 55], ["NoShow", 10], ["Cancelled", 10], ["Completed", 25]]);
          INTERVIEWS.push({
            id: "int" + intSeq++,
            submissionId: submission.id,
            candidateId: candidate.id,
            recruiterId: candidate.recruiterId,
            platformId: platform.id,
            clientId: client.id,
            date: intDate,
            round: rd,
            outcome,
          });
        }
      }

      // Offer record
      if (stageIdx >= 3) {
        const offerDate = addDays(date, randInt(15, 25));
        if (offerDate <= TODAY) {
          const accepted = stageIdx === 4;
          OFFERS.push({
            id: "off" + offSeq++,
            submissionId: submission.id,
            candidateId: candidate.id,
            recruiterId: candidate.recruiterId,
            clientId: client.id,
            date: offerDate,
            status: accepted ? "Accepted" : "Rejected",
          });

          // Rate confirmation — client confirms the bill rate before placement
          if (accepted) {
            const rateConfirmDate = addDays(offerDate, randInt(1, 4));
            let confirmed = false;
            if (rateConfirmDate <= TODAY) {
              confirmed = true;
              RATE_CONFIRMATIONS.push({
                id: "rc" + rcSeq++,
                submissionId: submission.id,
                candidateId: candidate.id,
                recruiterId: candidate.recruiterId,
                clientId: client.id,
                date: rateConfirmDate,
                confirmedRate: submission.rate + randInt(-2, 2),
              });
            }

            // Placement record — only once the rate has been confirmed
            if (confirmed) {
              const placeDate = addDays(rateConfirmDate, randInt(2, 8));
              if (placeDate <= TODAY) {
                const durationWeeks = randInt(12, 52);
                const value = submission.rate * 40 * durationWeeks;
                const margin = value * (0.12 + rand() * 0.1);
                PLACEMENTS.push({
                  id: "plc" + plcSeq++,
                  submissionId: submission.id,
                  candidateId: candidate.id,
                  recruiterId: candidate.recruiterId,
                  clientId: client.id,
                  roleId: candidate.roleId,
                  date: placeDate,
                  durationWeeks,
                  endDate: addDays(placeDate, durationWeeks * 7),
                  value: Math.round(value),
                  margin: Math.round(margin),
                });
              }
            }
          }
        }
      }
    }
  });

  // ---------- upcoming interviews ----------
  // The generator above only produces past/completed interviews (bounded by
  // TODAY). A handful of near-term "Scheduled" interviews are added so
  // forward-looking views (today's interview count, needs-attention lists)
  // have something real to show, tied to candidates who are mid-pipeline.
  {
    const midPipelineSubs = SUBMISSIONS.filter((s) => !s.terminal && s.stageIndex >= 1 && s.stageIndex <= 2);
    for (let i = 0; i < 7 && i < midPipelineSubs.length; i++) {
      const submission = pick(midPipelineSubs);
      const dayOffset = i < 3 ? 0 : randInt(1, 4); // first few "today"
      INTERVIEWS.push({
        id: "int" + intSeq++,
        submissionId: submission.id,
        candidateId: submission.candidateId,
        recruiterId: submission.recruiterId,
        platformId: submission.platformId,
        clientId: submission.clientId,
        date: addDays(TODAY, dayOffset),
        round: 1,
        outcome: "Scheduled",
      });
    }
  }

  // ---------- candidate current status (derived) ----------
  // A placement only holds "Placed" status for its contract duration — once
  // endDate passes, the candidate returns to the bench (matches real bench-sales
  // turnover; without this, placements accumulate forever and the pool skews
  // permanently "Placed" over a multi-year history).
  function computeCandidateStatus(candidate) {
    const placements = PLACEMENTS.filter((p) => p.candidateId === candidate.id).sort((a, b) => b.date - a.date);
    const currentPlacement = placements.find((p) => p.date <= TODAY && p.endDate >= TODAY);
    if (currentPlacement) return { status: "Placed", lastActivity: currentPlacement.date };

    const mostRecentEnded = placements.find((p) => p.endDate < TODAY);
    const effectiveBenchStart = mostRecentEnded ? mostRecentEnded.endDate : null;

    let subs = SUBMISSIONS.filter((s) => s.candidateId === candidate.id).sort((a, b) => b.date - a.date);
    if (effectiveBenchStart) subs = subs.filter((s) => s.date >= effectiveBenchStart);

    if (!subs.length) {
      const anchor = effectiveBenchStart || candidate.benchStartDate;
      const idleDays = Math.round((TODAY - anchor) / 86400000);
      return { status: idleDays > 60 ? "Inactive" : "Available", lastActivity: anchor, effectiveBenchStart };
    }
    const latest = subs[0];
    const idleDays = Math.round((TODAY - latest.date) / 86400000);
    let status;
    if (latest.terminal) status = idleDays > 30 ? "Available" : latest.stage;
    else if (latest.stageIndex === 0) status = "Submitted";
    else if (latest.stageIndex === 1) status = "Submitted";
    else if (latest.stageIndex === 2) status = "Interviewing";
    else if (latest.stageIndex === 3) status = "Offered";
    else status = "Submitted"; // stageIndex 4 here means that contract has since ended
    if (idleDays > 14 && (status === "Available" || status === "Submitted")) status = idleDays > 45 ? "Inactive" : "At Risk";
    return { status, lastActivity: latest.date, effectiveBenchStart };
  }

  CANDIDATES.forEach((c) => {
    const info = computeCandidateStatus(c);
    c.status = info.status;
    c.lastActivity = info.lastActivity;
    const anchor = info.effectiveBenchStart || c.benchStartDate;
    c.benchDays = Math.round((TODAY - anchor) / 86400000);
    c.idleDays = Math.round((TODAY - info.lastActivity) / 86400000);
  });

  // ---------- helpers: period resolution ----------
  function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
  function startOfWeek(d) { const x = startOfDay(d); const day = x.getDay(); const diff = (day === 0 ? 6 : day - 1); x.setDate(x.getDate() - diff); return x; }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
  function startOfQuarter(d) { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); }
  function endOfQuarter(d) { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999); }
  function startOfYear(d) { return new Date(d.getFullYear(), 0, 1); }
  function endOfYear(d) { return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); }

  const PERIOD_PRESETS = {
    "today": () => [startOfDay(TODAY), endOfDay(TODAY)],
    "yesterday": () => { const y = addDays(TODAY, -1); return [startOfDay(y), endOfDay(y)]; },
    "this-week": () => [startOfWeek(TODAY), endOfDay(TODAY)],
    "last-week": () => { const s = addDays(startOfWeek(TODAY), -7); return [s, endOfDay(addDays(s, 6))]; },
    "this-month": () => [startOfMonth(TODAY), endOfDay(TODAY)],
    "last-month": () => { const s = startOfMonth(new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)); return [s, endOfMonth(s)]; },
    "last-30": () => [addDays(TODAY, -29), endOfDay(TODAY)],
    "last-90": () => [addDays(TODAY, -89), endOfDay(TODAY)],
    "this-quarter": () => [startOfQuarter(TODAY), endOfDay(TODAY)],
    "last-quarter": () => { const s = startOfQuarter(TODAY); const prevQ = new Date(s.getFullYear(), s.getMonth() - 3, 1); return [prevQ, endOfQuarter(prevQ)]; },
    "this-year": () => [startOfYear(TODAY), endOfDay(TODAY)],
    "last-year": () => { const s = new Date(TODAY.getFullYear() - 1, 0, 1); return [s, endOfYear(s)]; },
  };

  function resolvePeriod(key) {
    return (PERIOD_PRESETS[key] || PERIOD_PRESETS["this-month"])();
  }

  function comparePeriod([start, end], mode) {
    const spanMs = end - start;
    if (mode === "previous-period") {
      return [new Date(start - spanMs - 86400000), new Date(start - 86400000)];
    }
    if (mode === "previous-year" || mode === "same-period-last-year") {
      return [new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()), new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())];
    }
    return null;
  }

  function inRange(date, [start, end]) {
    return date >= start && date <= end;
  }

  // ---------- generic filter application ----------
  // filters: { recruiterId, candidateId, platformId, roleId, clientId, location, status }
  function matchesFilters(rec, filters) {
    if (!filters) return true;
    if (filters.recruiterId && filters.recruiterId !== "all" && rec.recruiterId !== filters.recruiterId) return false;
    if (filters.candidateId && filters.candidateId !== "all" && rec.candidateId !== filters.candidateId) return false;
    if (filters.platformId && filters.platformId !== "all" && rec.platformId !== filters.platformId) return false;
    if (filters.roleId && filters.roleId !== "all" && rec.roleId !== filters.roleId) return false;
    if (filters.clientId && filters.clientId !== "all" && rec.clientId !== filters.clientId) return false;
    if (filters.location && filters.location !== "all") {
      const loc = rec.location || (candidateById[rec.candidateId] && candidateById[rec.candidateId].location);
      if (loc !== filters.location) return false;
    }
    if (filters.status && filters.status !== "all") {
      const st = rec.status || (candidateById[rec.candidateId] && candidateById[rec.candidateId].status);
      if (st !== filters.status) return false;
    }
    return true;
  }

  function queryDataset({ range, filters, dataset } = {}) {
    const ds = dataset || SUBMISSIONS;
    return ds.filter((r) => (!range || inRange(r.date, range)) && matchesFilters(r, filters));
  }

  // ---------- KPI computation for a range ----------
  function computeKPIs(range, filters) {
    const subs = queryDataset({ range, filters, dataset: SUBMISSIONS });
    const ints = queryDataset({ range, filters, dataset: INTERVIEWS });
    const offs = queryDataset({ range, filters, dataset: OFFERS });
    const rcs = queryDataset({ range, filters, dataset: RATE_CONFIRMATIONS });
    const plcs = queryDataset({ range, filters, dataset: PLACEMENTS });
    const matches = Math.round(subs.length * 1.32);
    const responses = subs.filter((s) => s.stageIndex >= 1 && !(s.terminal && s.stageIndex === 0)).length;
    const activeCandidates = CANDIDATES.filter((c) => matchesFilters(c, filters) && c.status !== "Placed" && c.status !== "Inactive").length;
    const availableCandidates = CANDIDATES.filter((c) => matchesFilters(c, filters) && c.status === "Available").length;
    const revenue = plcs.reduce((s, p) => s + p.value, 0);
    const margin = plcs.reduce((s, p) => s + p.margin, 0);
    return {
      activeCandidates,
      availableCandidates,
      matches,
      submissions: subs.length,
      responses,
      interviews: ints.length,
      offers: offs.length,
      rateConfirmations: rcs.length,
      placements: plcs.length,
      interviewRate: subs.length ? ints.length / subs.length : 0,
      placementRate: subs.length ? plcs.length / subs.length : 0,
      offerRate: ints.length ? offs.length / ints.length : 0,
      rateConfirmationRate: offs.length ? rcs.length / offs.length : 0,
      revenue,
      margin,
    };
  }

  function pctDelta(cur, prev) {
    if (!prev) return cur ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  }

  // ---------- monthly series for trend charts ----------
  function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
  function monthLabel(d) { return d.toLocaleString("en-US", { month: "short", year: "2-digit" }); }

  function monthlySeries(range, filters) {
    const [start, end] = range;
    const buckets = [];
    let cur = startOfMonth(start);
    while (cur <= end) {
      buckets.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return buckets.map((m) => {
      const mEnd = endOfMonth(m);
      const bucketRange = [m < start ? start : m, mEnd > end ? end : mEnd];
      const subs = queryDataset({ range: bucketRange, filters, dataset: SUBMISSIONS });
      const ints = queryDataset({ range: bucketRange, filters, dataset: INTERVIEWS });
      const offs = queryDataset({ range: bucketRange, filters, dataset: OFFERS });
      const plcs = queryDataset({ range: bucketRange, filters, dataset: PLACEMENTS });
      return {
        label: monthLabel(m),
        key: monthKey(m),
        submissions: subs.length,
        interviews: ints.length,
        offers: offs.length,
        placements: plcs.length,
        revenue: plcs.reduce((s, p) => s + p.value, 0),
      };
    });
  }

  function seriesByGranularity(range, filters, granularity) {
    const [start, end] = range;
    const buckets = [];
    if (granularity === "daily") {
      let cur = startOfDay(start);
      while (cur <= end) { buckets.push([new Date(cur), endOfDay(cur)]); cur = addDays(cur, 1); }
    } else if (granularity === "weekly") {
      let cur = startOfWeek(start);
      while (cur <= end) { const e = endOfDay(addDays(cur, 6)); buckets.push([cur < start ? start : cur, e > end ? end : e]); cur = addDays(cur, 7); }
    } else if (granularity === "quarterly") {
      let cur = startOfQuarter(start);
      while (cur <= end) { const e = endOfQuarter(cur); buckets.push([cur < start ? start : cur, e > end ? end : e]); cur = new Date(cur.getFullYear(), cur.getMonth() + 3, 1); }
    } else {
      let cur = startOfMonth(start);
      while (cur <= end) { const e = endOfMonth(cur); buckets.push([cur < start ? start : cur, e > end ? end : e]); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
    }
    return buckets.map(([bs, be]) => {
      const label = granularity === "daily" ? bs.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : granularity === "weekly" ? bs.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : granularity === "quarterly" ? `Q${Math.floor(bs.getMonth() / 3) + 1} '${String(bs.getFullYear()).slice(2)}`
        : monthLabel(bs);
      const subs = queryDataset({ range: [bs, be], filters, dataset: SUBMISSIONS });
      const ints = queryDataset({ range: [bs, be], filters, dataset: INTERVIEWS });
      const offs = queryDataset({ range: [bs, be], filters, dataset: OFFERS });
      const plcs = queryDataset({ range: [bs, be], filters, dataset: PLACEMENTS });
      return { label, submissions: subs.length, interviews: ints.length, offers: offs.length, placements: plcs.length, revenue: plcs.reduce((s, p) => s + p.value, 0) };
    });
  }

  function groupCount(list, keyFn) {
    const map = new Map();
    list.forEach((item) => {
      const k = keyFn(item);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }

  function platformPerformance(range, filters) {
    return PLATFORMS.map((pl) => {
      const subs = queryDataset({ range, filters, dataset: SUBMISSIONS }).filter((s) => s.platformId === pl.id);
      const ints = queryDataset({ range, filters, dataset: INTERVIEWS }).filter((s) => s.platformId === pl.id);
      const plcs = queryDataset({ range, filters, dataset: PLACEMENTS }).filter((s) => s.candidateId && SUBMISSIONS.find(su=>su.id===s.submissionId && su.platformId===pl.id));
      const responses = subs.filter((s) => s.stageIndex >= 1).length;
      return {
        platform: pl.name,
        id: pl.id,
        submissions: subs.length,
        responses,
        interviews: ints.length,
        placements: plcs.length,
        interviewPct: subs.length ? (ints.length / subs.length) * 100 : 0,
      };
    }).sort((a, b) => b.submissions - a.submissions);
  }

  function rolePerformance(range, filters) {
    return ROLES.map((role) => {
      const subs = queryDataset({ range, filters, dataset: SUBMISSIONS }).filter((s) => s.roleId === role.id);
      const ints = queryDataset({ range, filters, dataset: INTERVIEWS }).filter((s) => s.candidateId && candidateById[s.candidateId] && candidateById[s.candidateId].roleId === role.id);
      const plcs = queryDataset({ range, filters, dataset: PLACEMENTS }).filter((s) => s.roleId === role.id);
      return { role: role.name, id: role.id, submissions: subs.length, interviews: ints.length, placements: plcs.length };
    }).sort((a, b) => b.submissions - a.submissions);
  }

  function recruiterPerformance(range, filters) {
    return RECRUITERS.map((rec) => {
      const subs = queryDataset({ range, filters, dataset: SUBMISSIONS }).filter((s) => s.recruiterId === rec.id);
      const ints = queryDataset({ range, filters, dataset: INTERVIEWS }).filter((s) => s.recruiterId === rec.id);
      const offs = queryDataset({ range, filters, dataset: OFFERS }).filter((s) => s.recruiterId === rec.id);
      const plcs = queryDataset({ range, filters, dataset: PLACEMENTS }).filter((s) => s.recruiterId === rec.id);
      const candidates = CANDIDATES.filter((c) => c.recruiterId === rec.id);
      const revenue = plcs.reduce((s, p) => s + p.value, 0);
      return {
        recruiter: rec.name,
        id: rec.id,
        candidates: candidates.length,
        submissions: subs.length,
        interviews: ints.length,
        offers: offs.length,
        placements: plcs.length,
        placementRate: subs.length ? (plcs.length / subs.length) * 100 : 0,
        revenue,
      };
    }).sort((a, b) => b.submissions - a.submissions);
  }

  function clientPerformance(range, filters) {
    return CLIENTS.map((cl) => {
      const subs = queryDataset({ range, filters, dataset: SUBMISSIONS }).filter((s) => s.clientId === cl.id);
      const plcs = queryDataset({ range, filters, dataset: PLACEMENTS }).filter((s) => s.clientId === cl.id);
      const revenue = plcs.reduce((s, p) => s + p.value, 0);
      return { client: cl.name, id: cl.id, submissions: subs.length, placements: plcs.length, revenue };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  function funnelCounts(range, filters) {
    const kpi = computeKPIs(range, filters);
    return [
      { stage: "Available", value: CANDIDATES.filter((c) => matchesFilters(c, filters) && (c.status === "Available" || c.status === "At Risk")).length },
      { stage: "Matched", value: kpi.matches },
      { stage: "Submitted", value: kpi.submissions },
      { stage: "Response", value: kpi.responses },
      { stage: "Interview", value: kpi.interviews },
      { stage: "Offer", value: kpi.offers },
      { stage: "Rate Confirmed", value: kpi.rateConfirmations },
      { stage: "Placed", value: kpi.placements },
    ];
  }

  function candidateStatusBreakdown(filters) {
    const cands = CANDIDATES.filter((c) => matchesFilters(c, filters));
    return groupCount(cands, (c) => c.status);
  }

  function benchAgingBuckets(filters) {
    const cands = CANDIDATES.filter((c) => matchesFilters(c, filters) && c.status !== "Placed");
    const buckets = { "0-15": 0, "16-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    cands.forEach((c) => {
      const d = c.benchDays;
      if (d <= 15) buckets["0-15"]++;
      else if (d <= 30) buckets["16-30"]++;
      else if (d <= 60) buckets["31-60"]++;
      else if (d <= 90) buckets["61-90"]++;
      else buckets["90+"]++;
    });
    return buckets;
  }

  global.BenchData = {
    TODAY,
    RECRUITERS, PLATFORMS, ROLES, CLIENTS, LOCATIONS,
    CANDIDATES, SUBMISSIONS, INTERVIEWS, OFFERS, RATE_CONFIRMATIONS, PLACEMENTS,
    candidateById,
    resolvePeriod, comparePeriod, inRange,
    computeKPIs, pctDelta, monthlySeries, seriesByGranularity,
    platformPerformance, rolePerformance, recruiterPerformance, clientPerformance,
    funnelCounts, candidateStatusBreakdown, benchAgingBuckets,
    queryDataset, matchesFilters,
    startOfMonth, endOfMonth, startOfDay, endOfDay,
  };
})(window);
