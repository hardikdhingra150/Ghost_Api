import { mockPortalCredentials, mockPortalUrl } from "../../config.js";
import type { PortalWorkflow } from "../workflowTypes.js";

export const getAttendanceWorkflow: PortalWorkflow = {
  id: "get-attendance",
  portal: "mock-college-portal",
  name: "Get Attendance",
  description: "Login to the mock college portal, open Attendance, and extract the attendance table.",
  version: 2,
  steps: [
    {
      id: "open-portal",
      type: "goto",
      url: "{{portalUrl}}"
    },
    {
      id: "fill-username",
      type: "fill",
      target: "label:Student ID",
      value: "{{username}}"
    },
    {
      id: "fill-password",
      type: "fill",
      target: "label:Password",
      value: "{{password}}"
    },
    {
      id: "submit-login",
      type: "click",
      target: "role:button/Login"
    },
    {
      id: "wait-dashboard",
      type: "wait_for_url",
      pattern: "**/dashboard",
      timeoutMs: 5000
    },
    {
      id: "open-attendance",
      type: "click",
      target: "role:link/Attendance"
    },
    {
      id: "wait-attendance-table",
      type: "wait_for_selector",
      selector: "#attendance-table",
      timeoutMs: 5000
    },
    {
      id: "extract-student",
      type: "extract_text",
      name: "student",
      selector: "#student-name strong"
    },
    {
      id: "extract-semester",
      type: "extract_text",
      name: "semester",
      selector: "#semester strong"
    },
    {
      id: "extract-subjects",
      type: "extract_table",
      name: "subjects",
      selector: "#attendance-table",
      columns: [
        { name: "subject", type: "string" },
        { name: "attended", type: "number" },
        { name: "total", type: "number" },
        { name: "percentage", type: "percentage" }
      ]
    }
  ],
  output: {
    type: "attendance",
    sourcePortal: "mock-college-portal",
    studentField: "student",
    semesterField: "semester",
    subjectsField: "subjects"
  }
};

export const defaultGetAttendanceVariables = {
  portalUrl: mockPortalUrl,
  username: mockPortalCredentials.username,
  password: mockPortalCredentials.password
};
