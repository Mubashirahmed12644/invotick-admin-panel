import type { ReactNode } from "react";
import styles from "@/features/user-based-screen-flow/user-based-screen-flow.module.css";
import {
  BASE_Y,
  EVENT_CATEGORY_META,
  EVENT_LABEL_MIN_SPACING,
  EVENT_CATEGORY_LEGEND_ORDER,
  FLOW_COLORS,
  GRAPH_MIN_HEIGHT,
  GRAPH_MIN_WIDTH,
  LABEL_HEIGHT,
  LABEL_MAX_LEVEL_SEARCH,
  LABEL_VERTICAL_STEP,
  LOWER_LABEL_START_OFFSET,
  MAX_EVENT_LENGTH,
  MAX_SESSION_GAP_LENGTH,
  MIN_EVENT_LENGTH,
  MIN_SESSION_GAP_LENGTH,
  SESSION_GAP,
  SESSION_GAP_LABEL_Y,
  SESSION_QUALITY_META,
  START_X,
  UPPER_LABEL_START_OFFSET,
} from "@/features/user-based-screen-flow/constants";
import type { EventCategory, EventPoint, LabelBox, TimelineGraphResult, UserFlowRecord } from "@/features/user-based-screen-flow/types";
import {
  boxesOverlap,
  buildEventPointTitle,
  clampDistance,
  compactId,
  estimateLabelWidth,
  formatDateNormalized,
  formatDuration,
  formatTime,
  getEventCategory,
  getEventLabel,
  getSessionQuality,
} from "@/features/user-based-screen-flow/utils";

function renderCategoryMarker(
  category: EventCategory,
  x: number,
  y: number,
  sessionId: string,
  eventIndex: number,
  title: string,
) {
  const fill = EVENT_CATEGORY_META[category].color;

  if (category === "lifecycle") {
    return (
      <rect key={`event-marker-${sessionId}-${eventIndex}`} x={x - 4} y={y - 4} width="8" height="8" fill={fill}>
        <title>{title}</title>
      </rect>
    );
  }

  if (category === "navigation" || category === "action") {
    return (
      <polygon
        key={`event-marker-${sessionId}-${eventIndex}`}
        points={`${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`}
        fill={fill}
      >
        <title>{title}</title>
      </polygon>
    );
  }

  if (category === "data_commit") {
    return (
      <polygon
        key={`event-marker-${sessionId}-${eventIndex}`}
        points={`${x},${y - 7} ${x + 7},${y + 6} ${x - 7},${y + 6}`}
        fill={fill}
      >
        <title>{title}</title>
      </polygon>
    );
  }

  return (
    <circle key={`event-marker-${sessionId}-${eventIndex}`} cx={x} cy={y} r="6" fill={fill}>
      <title>{title}</title>
    </circle>
  );
}

export function renderLegendMarker(category: EventCategory) {
  const fill = EVENT_CATEGORY_META[category].color;

  if (category === "lifecycle") {
    return <rect x="5" y="5" width="8" height="8" fill={fill} />;
  }

  if (category === "navigation" || category === "action") {
    return <polygon points="9,1 17,9 9,17 1,9" fill={fill} />;
  }

  if (category === "data_commit") {
    return <polygon points="9,2 17,16 1,16" fill={fill} />;
  }

  return <circle cx="9" cy="9" r="6" fill={fill} />;
}

function buildBaseGraph(
  user: UserFlowRecord | null,
  options: {
    useCategoryMarkers: boolean;
    getSessionColor: (sessionIndex: number, session: UserFlowRecord["sessions"][number]) => string;
    sessionKeyPrefix: string;
  },
): TimelineGraphResult {
  const elements: ReactNode[] = [];
  const points: EventPoint[] = [];

  if (!user) {
    return { elements, points, width: GRAPH_MIN_WIDTH, height: GRAPH_MIN_HEIGHT };
  }

  let x = START_X;
  let previousSessionEndTime: string | null = null;
  const placedLabels: LabelBox[] = [];
  let maxLabelY = BASE_Y;
  const reserveLabel = (labelX: number, labelY: number, labelWidth: number): LabelBox => ({
    x1: labelX - (labelWidth / 2) - EVENT_LABEL_MIN_SPACING,
    x2: labelX + (labelWidth / 2) + EVENT_LABEL_MIN_SPACING,
    y1: labelY - LABEL_HEIGHT,
    y2: labelY + 4,
  });

  user.sessions.forEach((session, sessionIndex) => {
    const sessionColor = options.getSessionColor(sessionIndex, session);
    let lastEventTime = session.startTime;

    if (previousSessionEndTime && session.startTime) {
      const gapSec =
        (new Date(session.startTime).getTime() - new Date(previousSessionEndTime).getTime()) / 1000;
      const isNegativeGap = gapSec < 0;
      const gapLabel = formatDuration(gapSec);
      const gapWidth = clampDistance(Math.max(gapSec, 0), MIN_SESSION_GAP_LENGTH, MAX_SESSION_GAP_LENGTH);
      const gapLabelX = x + (gapWidth / 2);

      elements.push(
        <line
          key={`session-gap-line-${options.sessionKeyPrefix}-${session.sessionId}`}
          x1={x}
          y1={BASE_Y}
          x2={x + gapWidth}
          y2={BASE_Y}
          stroke={isNegativeGap ? "#d64545" : "#bcc7da"}
          strokeDasharray="5 5"
          strokeWidth="2"
        />,
      );

      const gapLabelWidth = estimateLabelWidth(gapLabel);
      const gapLabelBox = reserveLabel(gapLabelX, SESSION_GAP_LABEL_Y, gapLabelWidth);
      placedLabels.push(gapLabelBox);
      maxLabelY = Math.max(maxLabelY, gapLabelBox.y2);

      elements.push(
        <text
          key={`session-gap-label-${options.sessionKeyPrefix}-${session.sessionId}`}
          x={gapLabelX}
          y={SESSION_GAP_LABEL_Y}
          textAnchor="middle"
          className={isNegativeGap ? styles.graphGapLabelWarning : styles.graphGapLabel}
        >
          {gapLabel}
        </text>,
      );

      x += gapWidth;
    }

    const sessionStartX = x;

    elements.push(
      <text
        key={`session-id-${options.sessionKeyPrefix}-${session.sessionId}`}
        x={x}
        y={54}
        className={styles.graphSessionLabel}
        fill={sessionColor}
      >
        {compactId(session.sessionId, 6, 4)}
      </text>,
    );

    elements.push(
      <text key={`session-time-${options.sessionKeyPrefix}-${session.sessionId}`} x={x} y={70} className={styles.graphSessionTime}>
        {formatTime(session.startTime)}
      </text>,
    );

    elements.push(
      <text key={`session-date-${options.sessionKeyPrefix}-${session.sessionId}`} x={x} y={84} className={styles.graphSessionDate}>
        {formatDateNormalized(session.startTime)}
      </text>,
    );

    elements.push(
      <text
        key={`session-duration-${options.sessionKeyPrefix}-${session.sessionId}`}
        x={x}
        y={98}
        className={styles.graphSessionDuration}
      >
        {`Duration ${formatDuration(
          Math.max(
            (new Date(
              session.events.length > 0
                ? session.events[session.events.length - 1]?.timestamp || session.startTime
                : session.startTime,
            ).getTime() - new Date(session.startTime).getTime()) / 1000,
            0,
          ),
        )}`}
      </text>,
    );

    session.events.forEach((event, eventIndex) => {
      const label = getEventLabel(event);
      const labelWidth = estimateLabelWidth(label);
      const gap = Math.max(event.gapSec || 0, 0);
      const length = clampDistance(gap, MIN_EVENT_LENGTH, MAX_EVENT_LENGTH);
      const eventGapLabel = formatDuration(event.gapSec || 0);
      const category = getEventCategory(event);

      elements.push(
        <line
          key={`event-line-${options.sessionKeyPrefix}-${session.sessionId}-${eventIndex}`}
          x1={x}
          y1={BASE_Y}
          x2={x + length}
          y2={BASE_Y}
          stroke={sessionColor}
          strokeWidth="3"
          strokeLinecap="round"
        />,
      );

      x += length;
      const eventX = x;

      points.push({
        event,
        sessionId: session.sessionId,
        eventIndex,
        x: eventX,
        y: BASE_Y,
        color: options.useCategoryMarkers ? EVENT_CATEGORY_META[category].color : sessionColor,
      });

      let labelY = BASE_Y - UPPER_LABEL_START_OFFSET;
      let isUpperLane = true;
      let chosenBox: LabelBox | null = null;

      for (let level = 0; level < LABEL_MAX_LEVEL_SEARCH; level += 1) {
        const upperY = BASE_Y - UPPER_LABEL_START_OFFSET - (level * LABEL_VERTICAL_STEP);
        const lowerY = BASE_Y + LOWER_LABEL_START_OFFSET + (level * LABEL_VERTICAL_STEP);

        const upperBox = {
          x1: eventX - (labelWidth / 2) - EVENT_LABEL_MIN_SPACING,
          x2: eventX + (labelWidth / 2) + EVENT_LABEL_MIN_SPACING,
          y1: upperY - LABEL_HEIGHT,
          y2: upperY + 4,
        };

        const lowerBox = {
          x1: eventX - (labelWidth / 2) - EVENT_LABEL_MIN_SPACING,
          x2: eventX + (labelWidth / 2) + EVENT_LABEL_MIN_SPACING,
          y1: lowerY - LABEL_HEIGHT,
          y2: lowerY + 4,
        };

        const upperBlocked = placedLabels.some((placed) => boxesOverlap(placed, upperBox));
        const lowerBlocked = placedLabels.some((placed) => boxesOverlap(placed, lowerBox));

        if (!upperBlocked && !lowerBlocked) {
          if ((BASE_Y - upperY) <= (lowerY - BASE_Y)) {
            labelY = upperY;
            isUpperLane = true;
            chosenBox = upperBox;
          } else {
            labelY = lowerY;
            isUpperLane = false;
            chosenBox = lowerBox;
          }
          break;
        }

        if (!upperBlocked) {
          labelY = upperY;
          isUpperLane = true;
          chosenBox = upperBox;
          break;
        }

        if (!lowerBlocked) {
          labelY = lowerY;
          isUpperLane = false;
          chosenBox = lowerBox;
          break;
        }
      }

      if (!chosenBox) {
        labelY = BASE_Y + LOWER_LABEL_START_OFFSET + (LABEL_MAX_LEVEL_SEARCH * LABEL_VERTICAL_STEP);
        isUpperLane = false;
        chosenBox = {
          x1: eventX - (labelWidth / 2) - EVENT_LABEL_MIN_SPACING,
          x2: eventX + (labelWidth / 2) + EVENT_LABEL_MIN_SPACING,
          y1: labelY - LABEL_HEIGHT,
          y2: labelY + 4,
        };
      }

      placedLabels.push(chosenBox);
      maxLabelY = Math.max(maxLabelY, chosenBox.y2);

      const connectorEndY = isUpperLane ? labelY + 10 : labelY - 10;

      elements.push(
        <line
          key={`event-connector-${options.sessionKeyPrefix}-${session.sessionId}-${eventIndex}`}
          x1={eventX}
          y1={BASE_Y + (isUpperLane ? -7 : 7)}
          x2={eventX}
          y2={connectorEndY}
          stroke={options.useCategoryMarkers ? EVENT_CATEGORY_META[category].color : sessionColor}
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />,
      );

      elements.push(
        <text
          key={`event-label-${options.sessionKeyPrefix}-${session.sessionId}-${eventIndex}`}
          x={eventX}
          y={labelY}
          textAnchor="middle"
          className={styles.graphEventLabel}
        >
          {label}
        </text>,
      );

      elements.push(
        <text
          key={`event-gap-${options.sessionKeyPrefix}-${session.sessionId}-${eventIndex}`}
          x={eventX}
          y={BASE_Y + 18}
          textAnchor="middle"
          className={styles.graphEventGapLabel}
        >
          {eventGapLabel}
        </text>,
      );

      lastEventTime = event.timestamp;
    });

    const sessionEndX = x;

    elements.push(
      <rect
        key={`session-bg-${options.sessionKeyPrefix}-${session.sessionId}`}
        x={sessionStartX}
        y={BASE_Y - 56}
        width={Math.max(sessionEndX - sessionStartX, 0)}
        height={112}
        fill={sessionColor}
        opacity={options.useCategoryMarkers ? "0.09" : "0.07"}
      />,
    );

    previousSessionEndTime = lastEventTime;
    x += SESSION_GAP;
  });

  points.forEach((point) => {
    if (options.useCategoryMarkers) {
      elements.push(
        renderCategoryMarker(
          getEventCategory(point.event),
          point.x,
          point.y,
          point.sessionId,
          point.eventIndex,
          buildEventPointTitle(point.sessionId, point.eventIndex, point.event),
        ),
      );
      return;
    }

    elements.push(
      <circle key={`event-dot-${point.sessionId}-${point.eventIndex}`} cx={point.x} cy={point.y} r="5" fill={point.color}>
        <title>{buildEventPointTitle(point.sessionId, point.eventIndex, point.event)}</title>
      </circle>,
    );
  });

  return {
    elements,
    points,
    width: Math.max(x + 80, GRAPH_MIN_WIDTH),
    height: Math.max(GRAPH_MIN_HEIGHT, maxLabelY + 18),
  };
}

export function buildGraph(user: UserFlowRecord | null): TimelineGraphResult {
  return buildBaseGraph(user, {
    useCategoryMarkers: false,
    getSessionColor: (sessionIndex) => FLOW_COLORS[sessionIndex % FLOW_COLORS.length] || "#2563EB",
    sessionKeyPrefix: "v1",
  });
}

export function buildGraphV2(user: UserFlowRecord | null): TimelineGraphResult {
  return buildBaseGraph(user, {
    useCategoryMarkers: true,
    getSessionColor: (_, session) => SESSION_QUALITY_META[getSessionQuality(session)].color,
    sessionKeyPrefix: "v2",
  });
}

export { EVENT_CATEGORY_LEGEND_ORDER };
