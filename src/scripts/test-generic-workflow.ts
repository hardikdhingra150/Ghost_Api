const response = await fetch("http://127.0.0.1:4000/v1/workflows/portal-summary/run", {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    variables: {}
  })
});

const payload = (await response.json()) as {
  ok?: boolean;
  workflowId?: string;
  runId?: string;
  result?: {
    data?: {
      pageText?: string;
    };
  };
  error?: string;
};

if (!response.ok || !payload.ok) {
  throw new Error(`Generic workflow test failed: ${payload.error ?? response.statusText}`);
}

const pageText = payload.result?.data?.pageText;

if (!pageText?.includes("Welcome, Hardik")) {
  throw new Error("Generic workflow did not extract the expected portal page text");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workflowId: payload.workflowId,
      runId: payload.runId,
      outputKeys: Object.keys(payload.result?.data ?? {}),
      contains: "Welcome, Hardik"
    },
    null,
    2
  )
);
