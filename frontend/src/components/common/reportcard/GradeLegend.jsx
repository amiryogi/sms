import React from "react";

/**
 * The grade scale this card was graded on, printed as a small reference
 * table. Bands come from the payload's `gradeReference`; nothing is hardcoded.
 */
const GradeLegend = ({ bands }) => {
  if (!bands?.length) return null;

  return (
    <section className="rc-grade-legend">
      <table>
        <thead>
          <tr>
            <th>Grade</th>
            {bands.map((b) => (
              <th key={b.grade}>{b.grade}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Marks %</td>
            {bands.map((b) => (
              <td key={b.grade}>
                {b.min}–{b.max}
              </td>
            ))}
          </tr>
          <tr>
            <td>Grade point</td>
            {bands.map((b) => (
              <td key={b.grade}>{Number(b.gpa).toFixed(1)}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <style>{`
        .rc-grade-legend { margin: 6px 0; }
        .rc-grade-legend table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.5pt;
          table-layout: fixed;
        }
        .rc-grade-legend th,
        .rc-grade-legend td {
          border: 1px solid #000;
          padding: 2px 1px;
          text-align: center;
          color: #000;
          background: #fff;
        }
        .rc-grade-legend th:first-child,
        .rc-grade-legend td:first-child {
          width: 16%;
          text-align: left;
          padding-left: 4px;
          font-weight: bold;
        }
      `}</style>
    </section>
  );
};

export default GradeLegend;
