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
  //   freeNotes: string  // general notes
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
    setMondayBlock,
    setFreeNotes,
    clearAll,
    exportJSON,
    importJSON,
    exportSummary,
    getProgressCounts,
    copyToClipboard,
    downloadJSON,
    STORAGE_KEY
  };
})(window);
