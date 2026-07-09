import type { Locator, Page } from "playwright";

export function resolveTarget(page: Page, target: string): Locator {
  if (target.startsWith("css:")) {
    return page.locator(target.slice("css:".length));
  }

  if (target.startsWith("text:")) {
    return page.getByText(target.slice("text:".length), { exact: false });
  }

  if (target.startsWith("label:")) {
    return page.getByLabel(target.slice("label:".length));
  }

  if (target.startsWith("aria:")) {
    return page.getByLabel(new RegExp(target.slice("aria:".length), "i"));
  }

  if (target.startsWith("role:")) {
    const roleTarget = target.slice("role:".length);
    const [role, name] = roleTarget.split("/", 2);

    if (!role || !name) {
      throw new Error(`Invalid role target "${target}". Use role:<role>/<name>.`);
    }

    return page.getByRole(role as Parameters<Page["getByRole"]>[0], {
      name: new RegExp(escapeRegExp(name), "i")
    });
  }

  if (target.startsWith("href:")) {
    return page.locator(`a[href*="${cssEscape(target.slice("href:".length))}"]`);
  }

  return page.locator(target);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cssEscape(value: string): string {
  return value.replaceAll('"', '\\"');
}
