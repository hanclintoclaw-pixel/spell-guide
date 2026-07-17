const PREFILLED_ISSUE_URL_MAX_LENGTH = 7000

export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace'
  path: string
  value?: unknown
}

export interface PersistRequest<State> {
  schemaVersion: 'shadowrun-minigame-persist/v1'
  appId: string
  appName: string
  campaign: string
  createdAt: string
  sourceRepository: string
  sourceCommit: string
  localStorageKey: string
  summary: string
  canonicalTargets: string[]
  requestedChanges: Array<{
    type: string
    payload: State | JsonPatchOperation[]
    baseSnapshot?: string
    format?: 'json-patch/rfc6902'
  }>
}

export function loadLocalState<State>(key: string, fallback: State, isValid: (value: unknown) => value is State): State {
  const stored = window.localStorage.getItem(key)
  if (!stored) return fallback

  const parsed: unknown = JSON.parse(stored)
  if (!isValid(parsed)) {
    throw new Error(`Stored state for ${key} does not match the expected schema.`)
  }
  return parsed
}

export function saveLocalState<State>(key: string, state: State) {
  window.localStorage.setItem(key, JSON.stringify(state))
}

export function snapshotOf(value: unknown) {
  return JSON.stringify(value)
}

function escapeJsonPointerSegment(segment: string) {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1')
}

function joinJsonPointer(basePath: string, segment: string) {
  return `${basePath}/${escapeJsonPointerSegment(segment)}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function valuesMatch(before: unknown, after: unknown) {
  return JSON.stringify(before) === JSON.stringify(after)
}

export function buildJsonPatch(before: unknown, after: unknown, basePath = ''): JsonPatchOperation[] {
  if (valuesMatch(before, after)) return []

  if (Array.isArray(before) && Array.isArray(after)) {
    const operations: JsonPatchOperation[] = []
    const sharedLength = Math.min(before.length, after.length)

    for (let index = 0; index < sharedLength; index += 1) {
      operations.push(...buildJsonPatch(before[index], after[index], joinJsonPointer(basePath, String(index))))
    }
    for (let index = before.length - 1; index >= after.length; index -= 1) {
      operations.push({ op: 'remove', path: joinJsonPointer(basePath, String(index)) })
    }
    for (let index = sharedLength; index < after.length; index += 1) {
      operations.push({ op: 'add', path: joinJsonPointer(basePath, String(index)), value: after[index] })
    }
    return operations
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const operations: JsonPatchOperation[] = []
    const beforeKeys = new Set(Object.keys(before))
    const afterKeys = new Set(Object.keys(after))

    for (const key of beforeKeys) {
      if (!afterKeys.has(key)) {
        operations.push({ op: 'remove', path: joinJsonPointer(basePath, key) })
      }
    }
    for (const key of afterKeys) {
      const path = joinJsonPointer(basePath, key)
      if (!beforeKeys.has(key)) {
        operations.push({ op: 'add', path, value: after[key] })
      } else {
        operations.push(...buildJsonPatch(before[key], after[key], path))
      }
    }
    return operations
  }

  return [{ op: 'replace', path: basePath || '', value: after }]
}

export interface PersistIssueDraft {
  url: string
  attachment?: {
    filename: string
    content: string
  }
}

export function buildIssueBody<State>(request: PersistRequest<State>) {
  return `## Human summary

${request.summary}

## Machine-readable request

\`\`\`json
${JSON.stringify(request, null, 2)}
\`\`\`
`
}

export function buildAttachmentIssueBody<State>(request: PersistRequest<State>, filename: string) {
  return `## Human summary

${request.summary}

## Machine-readable request

The JSON Patch request was too large for a prefilled GitHub Issue URL. Please attach the downloaded file to this issue before submitting it.

Expected attachment: \`${filename}\`
`
}

export function buildIssueUrl(issueRepositoryUrl: string, title: string, body: string) {
  const params = new URLSearchParams({
    title,
    labels: 'minigame-persist,needs-review',
    body,
  })
  return `${issueRepositoryUrl}?${params.toString()}`
}

export function buildIssueDraft<State>(issueRepositoryUrl: string, title: string, request: PersistRequest<State>, filenameBase: string): PersistIssueDraft {
  const prefilledUrl = buildIssueUrl(issueRepositoryUrl, title, buildIssueBody(request))

  if (prefilledUrl.length <= PREFILLED_ISSUE_URL_MAX_LENGTH) {
    return { url: prefilledUrl }
  }

  const filename = `${filenameBase}-persist-request-${new Date().toISOString().slice(0, 10)}.json`
  return {
    url: buildIssueUrl(issueRepositoryUrl, title, buildAttachmentIssueBody(request, filename)),
    attachment: {
      filename,
      content: `${JSON.stringify(request, null, 2)}\n`,
    },
  }
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
