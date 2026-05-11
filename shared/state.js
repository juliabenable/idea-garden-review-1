/* Idea Garden Review · client-side state
 * All decisions, notes, and Monday-plan progress live in localStorage.
 * Export/import via JSON or a human-readable summary I can ingest in chat.
 */

(function (global) {
  const STORAGE_KEY = 'ideaGardenReview.v1';

  // ---- Schema ----
  // {
  //   updatedAt: ISO string,
  //   decisions: {
  //     "D-01": { option: "A" | "B" | "C" | "custom", customText?: string, note?: string }
  //   },
  //   clusterLanes: {
  //     "01": "now" | "next" | "later" | "park" | null
  //   },
  //   ideaFlags: {
  //     "94": true
  //   },
  //   mondayBlocks: {
  //     "1": true, "2": false, ...
  //   },
  //   ideaStages: {
  //     "94": "has-legs" | "spark" | "exploring" | "ready-to-scope" | "in-progress" | "queued" | "park"
  //   },
  //   followups: {
  //     "D-01": { "0": { done: true, note?: string }, "1": { done: false } }
  //   },
  //   freeNotes: string
  // }

  function getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch (e) {
      console.error('Failed to read state', e);
      return defaultState();
    }
  }

  function defaultState() {
    return {
      updatedAt: null,
      decisions: {},
      clusterLanes: {},
      ideaFlags: {},
      ideaStages: {},
      followups: {},
      mondayBlocks: {},
      freeNotes: ''
    };
  }

  function saveState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent('igr:state-changed', { detail: state }));
  }

  function setDecision(id, option, opts) {
    const state = getState();
    const existing = state.decisions[id] || {};
    state.decisions[id] = {
      ...existing,
      option,
      ...(opts || {})
    };
    saveState(state);
    return state;
  }

  function setDecisionNote(id, note) {
    const state = getState();
    const existing = state.decisions[id] || { option: null };
    state.decisions[id] = { ...existing, note };
    saveState(state);
    return state;
  }

  function setDecisionCustom(id, customText) {
    return setDecision(id, 'custom', { customText });
  }

  function clearDecision(id) {
    const state = getState();
    delete state.decisions[id];
    saveState(state);
    return state;
  }

  function setClusterLane(id, lane) {
    const state = getState();
    if (lane === null || lane === undefined) {
      delete state.clusterLanes[id];
    } else {
      state.clusterLanes[id] = lane;
    }
    saveState(state);
    return state;
  }

  function setIdeaFlag(id, flagged) {
    const state = getState();
    if (flagged) {
      state.ideaFlags[id] = true;
    } else {
      delete state.ideaFlags[id];
    }
    saveState(state);
    return state;
  }

  function setIdeaStage(id, stage) {
    const state = getState();
    if (!stage) {
      delete state.ideaStages[id];
    } else {
      state.ideaStages[id] = stage;
    }
    saveState(state);
    return state;
  }

  function getIdeaStage(id) {
    const state = getState();
    return state.ideaStages[id] || null;
  }

  function setFollowupTask(decisionId, taskIndex, patch) {
    const state = getState();
    if (!state.followups[decisionId]) state.followups[decisionId] = {};
    const existing = state.followups[decisionId][taskIndex] || {};
    state.followups[decisionId][taskIndex] = { ...existing, ...patch };
    saveState(state);
    return state;
  }

  function getFollowupTask(decisionId, taskIndex) {
    const state = getState();
    return (state.followups[decisionId] || {})[taskIndex] || null;
  }

  function setMondayBlock(id, done) {
    const state = getState();
    state.mondayBlocks[id] = !!done;
    saveState(state);
    return state;
  }

  function setFreeNotes(text) {
    const state = getState();
    state.freeNotes = text;
    saveState(state);
    return state;
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    document.dispatchEvent(new CustomEvent('igr:state-changed', { detail: defaultState() }));
  }

  function exportJSON() {
    return JSON.stringify(getState(), null, 2);
  }

  function importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      const merged = { ...defaultState(), ...parsed };
      saveState(merged);
      return { ok: true, state: merged };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Human-readable summary I can ingest directly in chat
  function exportSummary() {
    const state = getState();
    const lines = [];
    const ts = state.updatedAt ? new Date(state.updatedAt).toLocaleString() : 'never';

    lines.push('# Idea Garden Review — Decisions Snapshot');
    lines.push('');
    lines.push(`_Last updated: ${ts}_`);
    lines.push('');

    // Decisions
    const decisionIds = Object.keys(state.decisions).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10);
      const nb = parseInt(b.replace(/\D/g, ''), 10);
      return na - nb;
    });

    if (decisionIds.length === 0) {
      lines.push('## Decisions');
      lines.push('_None made yet._');
    } else {
      lines.push(`## Decisions (${decisionIds.length} of 24)`);
      lines.push('');
      for (const id of decisionIds) {
        const d = state.decisions[id];
        const optStr = d.option === 'custom'
          ? `custom — ${d.customText || '(no text)'}`
          : `Option ${d.option}`;
        lines.push(`- **${id}** → ${optStr}${d.note ? '  \n  _note: ' + d.note + '_' : ''}`);
      }
    }
    lines.push('');

    // Cluster lanes (if any are set)
    const laneIds = Object.keys(state.clusterLanes);
    if (laneIds.length > 0) {
      lines.push('## Cluster lanes');
      lines.push('');
      for (const id of laneIds.sort()) {
        lines.push(`- Cluster ${id} → **${state.clusterLanes[id]}**`);
      }
      lines.push('');
    }

    // Flagged ideas
    const flagIds = Object.keys(state.ideaFlags);
    if (flagIds.length > 0) {
      lines.push('## Flagged ideas');
      lines.push('');
      lines.push(flagIds.sort((a, b) => parseInt(a) - parseInt(b)).map(id => `ID ${id}`).join(', '));
      lines.push('');
    }

    // Monday blocks
    const blockIds = Object.keys(state.mondayBlocks).filter(id => state.mondayBlocks[id]);
    if (blockIds.length > 0) {
      lines.push('## Monday plan blocks done');
      lines.push('');
      for (const id of blockIds.sort()) {
        lines.push(`- ✓ Block ${id}`);
      }
      lines.push('');
    }

    // Free notes
    if (state.freeNotes && state.freeNotes.trim()) {
      lines.push('## Notes');
      lines.push('');
      lines.push(state.freeNotes.trim());
      lines.push('');
    }

    return lines.join('\n');
  }

  // Counters useful for headers
  function getProgressCounts() {
    const state = getState();
    return {
      decisionsMade: Object.keys(state.decisions).length,
      decisionsTotal: 24,
      lanesSet: Object.keys(state.clusterLanes).length,
      lanesTotal: 14,
      blocksDone: Object.values(state.mondayBlocks).filter(Boolean).length,
      blocksTotal: 5,
      flaggedIdeas: Object.keys(state.ideaFlags).length
    };
  }

  // Clipboard helper that survives sandboxed iframes
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback: temporary textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        return true;
      } catch (e2) {
        return false;
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  function downloadJSON(filename) {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `idea-garden-decisions-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Shareable URL encoding ----
  // Encode the full state into a base64 string in the URL hash so users can
  // share a single link and restore state on another device or browser.
  function getShareableUrl() {
    const json = exportJSON();
    const compact = JSON.stringify(JSON.parse(json));
    const encoded = encodeURIComponent(b64encode(compact));
    // Anchor to root so the link drops users at index.html with state intact
    const baseUrl = inferRootUrl();
    return `${baseUrl}/#state=${encoded}`;
  }

  function inferRootUrl() {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    // Strip filename + the cluster/decisions/ideas subpath if present
    let path = pathname.replace(/\/[^/]*$/, '');
    path = path.replace(/\/(clusters|decisions|ideas|shared)(\/.*)?$/, '');
    if (origin.startsWith('file://')) {
      return 'https://juliabenable.github.io/idea-garden-review-1';
    }
    return origin + path;
  }

  function b64encode(s) {
    return btoa(unescape(encodeURIComponent(s)));
  }
  function b64decode(s) {
    try { return decodeURIComponent(escape(atob(s))); } catch (e) { return null; }
  }

  // Try loading state from URL hash on page load. Returns true if state was
  // applied. Caller decides whether to keep existing state.
  function tryLoadFromUrl() {
    const hash = window.location.hash || '';
    const match = hash.match(/state=([^&]+)/);
    if (!match) return { found: false };
    const decoded = b64decode(decodeURIComponent(match[1]));
    if (!decoded) return { found: true, ok: false, error: 'corrupt' };
    const result = importJSON(decoded);
    if (result.ok) {
      // Clean the hash so refresh doesn't keep re-importing
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (e) { /* ignore */ }
    }
    return { found: true, ...result };
  }

  // Best-effort autoload at module init. Pages can read the result if they
  // care (e.g. show a "state loaded from link" toast).
  let __autoLoadResult = { found: false };
  if (typeof window !== 'undefined') {
    try { __autoLoadResult = tryLoadFromUrl(); } catch (e) { /* ignore */ }
  }
  function getAutoLoadResult() { return __autoLoadResult; }

  // Public API
  global.IGR = {
    getState,
    saveState,
    setDecision,
    setDecisionNote,
    setDecisionCustom,
    clearDecision,
    setClusterLane,
    setIdeaFlag,
    setIdeaStage,
    getIdeaStage,
    setFollowupTask,
    getFollowupTask,
    setMondayBlock,
    setFreeNotes,
    clearAll,
    exportJSON,
    importJSON,
    exportSummary,
    getProgressCounts,
    copyToClipboard,
    downloadJSON,
    getShareableUrl,
    tryLoadFromUrl,
    getAutoLoadResult,
    STORAGE_KEY
  };
})(window);
