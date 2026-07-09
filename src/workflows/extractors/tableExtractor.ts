import type { Locator } from "playwright";
import type { WorkflowTableColumn } from "../workflowTypes.js";

export async function extractTable(locator: Locator, columns: WorkflowTableColumn[]): Promise<Record<string, unknown>[]> {
  return locator.locator("tbody tr").evaluateAll(
    (rows, columnDefs) => {
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent?.trim() ?? "");

        return columnDefs.reduce<Record<string, unknown>>((record, column, index) => {
          const rawValue = cells[index] ?? "";

          if (column.type === "number") {
            record[column.name] = Number(rawValue);
            return record;
          }

          if (column.type === "percentage") {
            record[column.name] = Number(rawValue.replace("%", ""));
            return record;
          }

          record[column.name] = rawValue;
          return record;
        }, {});
      });
    },
    columns
  );
}
