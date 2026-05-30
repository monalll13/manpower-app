import React, { useEffect, useMemo, useState, type ChangeEvent } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwPLjg7qiMzUBBLyxOQhhywm-Caus9cDzRiaVmc5qwO6VWxU90mLoMCpE57oECqbomfnQ/exec";

const staff = ["แตง", "แป้ง", "ฟ้า", "มี่", "ปราง"];

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getStatus(count: number) {
  if (count >= 4) return { text: "พอ", color: "#16a34a" };
  if (count === 3) return { text: "เสี่ยง", color: "#f59e0b" };
  return { text: "ไม่พอ", color: "#ef4444" };
}

export default function App() {
  const [data, setData] = useState<Record<string, Record<string, string>>>({});
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [modal, setModal] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((json) => setData(json));
  }, []);

  const selectedYear = useMemo(() => new Date(selectedDate).getFullYear(), [selectedDate]);
  const selectedMonth = useMemo(() => new Date(selectedDate).getMonth(), [selectedDate]);

  const monthDays = useMemo(() => {
    const days = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) =>
      formatDate(new Date(selectedYear, selectedMonth, i + 1))
    );
  }, [selectedMonth, selectedYear]);

  const calendarDays = useMemo<Array<string | null>>(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const days = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const blankDays = Array.from({ length: firstDay }, () => null) as Array<string | null>;
    const monthDates = Array.from({ length: days }, (_, i) =>
      formatDate(new Date(selectedYear, selectedMonth, i + 1))
    );
    const totalCells = firstDay + days;
    const rows = Math.ceil(totalCells / 7);
    const fillCount = rows * 7 - totalCells;
    const trailingBlanks = Array.from({ length: fillCount }, () => null) as Array<string | null>;
    return [...blankDays, ...monthDates, ...trailingBlanks];
  }, [selectedMonth, selectedYear]);

  const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  const today = data[selectedDate] || {};
  const todayCount = Object.values(today).filter((v) => v === "มา").length;
  const status = getStatus(todayCount);

  const monthCounts = monthDays.map((date: string) =>
    Object.values(data[date] || {}).filter((v) => v === "มา").length
  );
  const totalPresent = monthCounts.reduce((sum: number, value: number) => sum + value, 0);
  const avgPresent = monthDays.length ? totalPresent / monthDays.length : 0;
  const missingDays = monthCounts.filter((value: number) => value < 4).length;

  function dayStatusClass(count: number) {
    if (count >= 4) return "status-full";
    if (count === 3) return "status-risk";
    return "status-low";
  }

  function goNextDay() {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    const nextDate = formatDate(next);
    setSelectedDate(nextDate);
  }

  function handleMonthChange(e: ChangeEvent<HTMLSelectElement>) {
    const newMonth = Number(e.target.value);
    setSelectedDate(formatDate(new Date(selectedYear, newMonth, 1)));
  }

  async function swap(toDate: string) {
    if (!modal) return;

    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "swap",
        name: modal.name,
        fromDate: selectedDate,
        toDate,
      }),
    });

    setData((prev: Record<string, Record<string, string>>) => {
      const next = { ...prev };
      if (!next[selectedDate]) next[selectedDate] = {};
      if (!next[toDate]) next[toDate] = {};
      next[selectedDate][modal.name] = "ลา";
      next[toDate][modal.name] = "มา";
      return next;
    });

    setModal(null);
  }

  return (
    <div className="app-shell">
      <header className="topbar glass-card">
        <div>
          <p className="eyebrow">MANPOWER</p>
          <h1>แดชบอร์ดกำลังคน</h1>
          <p className="subtext">วันที่เลือก: {selectedDate}</p>
        </div>
        <div className="topbar-actions">
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
          >
            {[...Array(12)].map((_, index) => (
              <option key={index} value={index}>
                เดือน {index + 1}
              </option>
            ))}
          </select>
          <button className="nav-button" type="button" onClick={goNextDay}>
            Next
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-card glass-card">
          <p className="summary-label">สถานะวันนี้</p>
          <h2>{status.text}</h2>
          <p className="status-pill" style={{ background: status.color }}>
            {todayCount}/4 คน
          </p>
        </article>
        <article className="summary-card glass-card">
          <p className="summary-label">วันที่เสี่ยง</p>
          <h2>{missingDays}</h2>
          <p>วันไม่ครบ 4 คน</p>
        </article>
      </section>

      <section className="calendar-panel glass-card">
        <div className="panel-header">
          <div>
            <p className="panel-title">ปฏิทินเดือนนี้</p>
            <p className="panel-copy">แสดงจำนวนคนมาทุกวัน พร้อมไฮไลท์สถานะ</p>
          </div>
          <div className="legend">
            <span className="legend-item status-full">4</span>
            <span className="legend-item status-risk">3</span>
            <span className="legend-item status-low">0-2</span>
          </div>
        </div>
        <div className="weekday-row">
          {weekdays.map((weekday) => (
            <div key={weekday} className="weekday-item">
              {weekday}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={index} className="calendar-cell empty" />;
            }

            const count = Object.values(data[date] || {}).filter(
              (value) => value === "มา"
            ).length;
            const statusClass = dayStatusClass(count);
            const selected = selectedDate === date;

            return (
              <button
                key={date}
                className={`calendar-cell ${statusClass} ${selected ? "selected" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                <span>{new Date(date).getDate()}</span>
                <small>{count}/4</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="staff-panel">
        {staff.map((name) => (
          <button
            key={name}
            className="staff-card glass-card"
            onClick={() => setModal({ name })}
          >
            <div>
              <p className="staff-name">{name}</p>
              <p className="staff-status">{today[name] || "-"}</p>
            </div>
            <span className="staff-action">แก้ไข</span>
          </button>
        ))}
      </section>

      <div className={`sheet-overlay ${modal ? "visible" : ""}`} />
      <aside className={`bottom-sheet ${modal ? "open" : ""}`}>
        <div className="sheet-header">
          <div>
            <p className="eyebrow">Bottom Sheet</p>
            <h2>ย้าย {modal?.name}</h2>
          </div>
          <button className="close-sheet" onClick={() => setModal(null)}>
            ✕
          </button>
        </div>
        <div className="sheet-copy">เลือกวันที่เพื่อย้ายพนักงาน</div>
        <div className="sheet-list">
          {monthDays.map((date) => (
            <button
              key={date}
              type="button"
              className="sheet-item"
              onClick={() => swap(date)}
            >
              <span>{date}</span>
              <strong>
                {Object.values(data[date] || {}).filter((value) => value === "มา").length}/4
              </strong>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
