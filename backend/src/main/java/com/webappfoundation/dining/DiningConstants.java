package com.webappfoundation.dining;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

/** itemType keys, workflow codes and service hours for TIAN's dining domain. */
public final class DiningConstants {
    private DiningConstants() {}

    public static final String DISH = "DISH";
    public static final String TABLE = "TABLE";

    public static final String WF_TABLE = "table-booking";
    public static final String WF_TAKEAWAY = "takeaway";

    public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    /** How far ahead a table can be booked. */
    public static final int BOOKING_WINDOW_DAYS = 45;
    /** Minimum lead time before a slot (minutes) so the host can prepare. */
    public static final int MIN_LEAD_MINUTES = 30;

    /** Seating slots: lunch 11:30–14:30, dinner 18:30–22:30 (kitchen hours 11–3:30 & 6:30–11:30). */
    public static final List<LocalTime> SLOTS = List.of(
            LocalTime.of(11, 30), LocalTime.of(12, 0), LocalTime.of(12, 30), LocalTime.of(13, 0),
            LocalTime.of(13, 30), LocalTime.of(14, 0), LocalTime.of(14, 30),
            LocalTime.of(18, 30), LocalTime.of(19, 0), LocalTime.of(19, 30), LocalTime.of(20, 0),
            LocalTime.of(20, 30), LocalTime.of(21, 0), LocalTime.of(21, 30), LocalTime.of(22, 0),
            LocalTime.of(22, 30));
}
