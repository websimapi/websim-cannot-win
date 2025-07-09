import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { WebsimSocket, useQuery } from "@websim/use-query";
const room = new WebsimSocket();
function App() {
  const { data: countsData, loading: countsLoading } = useQuery(room.query(`
        SELECT
            (SELECT COUNT(*) FROM public.losses) as all_time,
            (SELECT COUNT(*) FROM public.losses WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')) as today,
            (SELECT COUNT(*) FROM public.losses WHERE created_at >= date_trunc('week', now() AT TIME ZONE 'UTC')) as week
    `));
  const { data: recentLoserData } = useQuery(room.query(`
        SELECT u.username
        FROM public.losses l
        JOIN public.user u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 1
    `));
  const counts = countsData ? countsData[0] : { all_time: 0, today: 0, week: 0 };
  const recentLoser = recentLoserData && recentLoserData.length > 0 ? recentLoserData[0].username : "...";
  useEffect(() => {
    if (countsLoading) {
      return;
    }
    const recordLoss = async () => {
      try {
        const lastLossTime = sessionStorage.getItem("lastLossTime");
        if (lastLossTime && Date.now() - parseInt(lastLossTime, 10) < 1e3 * 10) {
          return;
        }
        const currentAllTimeCount = counts.all_time;
        await room.collection("losses").create({
          all_time_count: currentAllTimeCount + 1
        });
        sessionStorage.setItem("lastLossTime", Date.now().toString());
      } catch (error) {
        console.error("Failed to record the loss:", error);
      }
    };
    recordLoss();
  }, [countsLoading, counts]);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("main", { children: /* @__PURE__ */ jsxDEV("h1", { children: "You Just Lost The Game" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 60,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 59,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "counter top-left", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "counter-label", children: "Latest Loser" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 64,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "recent-loser", children: recentLoser }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 65,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 63,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "counter top-right", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "counter-label", children: "Today" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 69,
        columnNumber: 17
      }, this),
      counts.today
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 68,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "counter bottom-left", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "counter-label", children: "All Time" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 74,
        columnNumber: 17
      }, this),
      counts.all_time
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 73,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "counter bottom-right", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "counter-label", children: "This Week" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 79,
        columnNumber: 17
      }, this),
      counts.week
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 78,
      columnNumber: 13
    }, this)
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 58,
    columnNumber: 9
  }, this);
}
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 87,
  columnNumber: 13
}));
