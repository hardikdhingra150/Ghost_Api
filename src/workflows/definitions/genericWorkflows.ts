import { mockPortalUrl } from "../../config.js";
import type { PortalWorkflow } from "../workflowTypes.js";

export const portalSummaryWorkflow: PortalWorkflow = {
  id: "portal-summary",
  portal: "mock-college-portal",
  name: "Portal Summary",
  description: "Open the mock college portal dashboard and extract visible dashboard text as generic JSON.",
  version: 1,
  defaultVariables: {
    portalUrl: mockPortalUrl
  },
  steps: [
    {
      id: "open-dashboard",
      type: "goto",
      url: "{{portalUrl}}/dashboard"
    },
    {
      id: "extract-page-text",
      type: "extract_text",
      name: "pageText",
      selector: "body"
    }
  ],
  output: {
    type: "generic",
    sourcePortal: "mock-college-portal",
    fields: {
      pageText: "pageText"
    }
  }
};

export const googleSearchWorkflow: PortalWorkflow = {
  id: "google-search",
  portal: "google",
  name: "Google Search",
  description: "Open a public Google search results page and extract visible page text as generic JSON.",
  version: 1,
  defaultVariables: {
    query: "ghostapi"
  },
  steps: [
    {
      id: "open-google-search",
      type: "goto",
      url: "https://www.google.com/search?q={{query}}"
    },
    {
      id: "wait-page",
      type: "wait_for_selector",
      selector: "body",
      timeoutMs: 10000
    },
    {
      id: "extract-page-text",
      type: "extract_text",
      name: "pageText",
      selector: "body"
    }
  ],
  output: {
    type: "generic",
    sourcePortal: "google",
    fields: {
      pageText: "pageText"
    }
  }
};
