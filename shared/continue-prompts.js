/* Continue-with-Claude prompt generator
 * For each decision, holds the cluster context + per-option follow-up tasks
 * so a single click produces a self-contained prompt to paste into chat.
 *
 * Depends on state.js — extends window.IGR with continuePrompt() and
 * continuePromptForAll().
 */
(function (global) {
  const CLUSTERS = {
    '01': {
      title: 'UGC Studio & Content Licensing',
      context: 'The single most validated unlock in the backlog (Hanah, Morgan, Kelly, Sophia all loved it). Three pieces: the licensing transaction, the signal layer (auto-detection), and the creator-side rate-setting opt-in.'
    },
    '02': {
      title: 'Brand Portal Sales Tools',
      context: 'Brand Intelligence Dashboard + Brand CRM + outreach automation. The features brands actually pay for; the surface that decides whether they renew.'
    },
    '03': {
      title: 'Brand Campaign Configuration',
      context: 'Campaign builder v2 — bundling content rules, commerce config, and creator-side selection caps. Mostly table-stakes that have been hard-coded; the May 8 Slack thread on Earth Science was the catalyst.'
    },
    '04': {
      title: 'Creator Onboarding & Profile',
      context: 'Reduce 50% rejection rate by capturing the right signals at onboarding; show a creator profile brands trust (Charisse, Jessica White, Veronica all asked for variants).'
    },
    '05': {
      title: 'Creator Portal Quality of Life',
      context: 'Bundled "listen sprint": invite notifications (Leea missed her invite), address visibility, hashtag prompts, content type clarity, deadline mechanics. Many small validated wins.'
    },
    '06': {
      title: 'Affiliate Link Management & Distribution',
      context: 'Closes the ShopMy parity gap. Link library + click analytics + distribution surfaces (keyboard, native share, IG carousel, ManyChat).'
    },
    '07': {
      title: 'Discovery & Homepage Rethink',
      context: '"Top 60 then nothing" problem. Three competing hypotheses (people-first / interest-first / vertical-first). Needs a prototype sprint, not a tactical redesign.'
    },
    '08': {
      title: 'People-First / Social / Community',
      context: 'Niche communities (POTS, PNW), accountability groups, vouches, weekly prompts. Pilot one real community before generalizing.'
    },
    '09': {
      title: 'Reactivation, Referrals & Growth Loops',
      context: 'Reactivation autopilot (best 2.86%, mass at 0.3-1.2%) + referral momentum (K-factor ~0.1 but 40% of signups come from referrals).'
    },
    '10': {
      title: 'Events Strategy & Brand Acquisition',
      context: 'Productize the event-loop that already sources brands (Pholk, Solara, Prose). Likely Tony\'s-team ops tooling rather than your roadmap.'
    },
    '11': {
      title: 'Local / Location-Based Matching',
      context: 'Local creator-brand matching. Blocked on audience-verification; needs a 2-week experiment with one vertical before any product commitment.'
    },
    '12': {
      title: 'Internal AI Tools & Workflow',
      context: 'Internal tooling — prototype review tool (85% built), spec gap detector, AI creator cards. Opportunistic, not own track.'
    },
    '13': {
      title: 'Mobile Invite / Deep Link Investigation',
      context: 'AppsFlyer iOS deferred deep-link issue from the May 8 Slack thread. Walteria Curtis + Millie Meza both hit code-entry instead of invited-by. Resilience layer + AppsFlyer fix + logging in parallel.'
    }
  };

  const DECISIONS = {
    'D-01': {
      cluster: '01',
      title: 'UGC Studio · pool boundary for licensing',
      question: 'Should licensing be available only inside the brand-creator campaign relationship, or open to brands that haven\'t worked with that creator?',
      options: {
        A: {
          label: 'Inside-the-pool only (v1)',
          followups: [
            'Write the standard licensing contract template covering Organic 30d / Paid 30d / Perpetual tiers',
            'Spec the brand-side "available content within your pool" surface (uses the marketplace design from cluster 01)',
            'Define the pool-boundary edge cases — creator in multiple brand pools, expired campaign relationships',
            'Plan the concierge pilot: 5 brands × 5 creators × 1 license each. What tooling do we actually need vs. doing it manually?'
          ]
        },
        B: {
          label: 'Open marketplace from day one',
          followups: [
            'Design the creator-protection mechanics: block brand, decline a tier per brand, report inappropriate brand',
            'Decide brand-onboarding requirements — what credentials/verification does a marketplace brand need?',
            'Spec the discovery surface (search, filter, recommend) for brands browsing across all creators',
            'Audit legal + trust-and-safety implications; identify deal-breakers before committing to scope'
          ]
        },
        C: {
          label: 'Hybrid — pool by default, opt-in to public',
          followups: [
            'Spec the creator-side "opt in to public marketplace" toggle (default off; clear value framing)',
            'Build pool-first as v1; document the explicit path to public for v1.5',
            'Define the trust signals that earn "public marketplace" access for brands (campaign history? rating?)',
            'Compare against pure pool-only v1 — what slips by adding this complexity now vs. later?'
          ]
        }
      }
    },

    'D-02': {
      cluster: '01',
      title: 'UGC Studio · pricing model / take rate',
      question: 'Fixed take rate vs. tiered take vs. subscription bundle for the platform fee on UGC licensing?',
      options: {
        A: {
          label: 'Flat 15% take rate per license',
          followups: [
            'Define exactly which event triggers the 15% (license complete, payout cleared, etc.)',
            'Decide whether to expose the take rate to creators in the rate-setting UI (transparency vs. friction)',
            'Set up an A/B framework so we can test 10% / 15% / 20% once we have liquidity in ~6 months',
            'Calculate breakeven volume given Stripe fees + platform support cost per license'
          ]
        },
        B: {
          label: 'Tiered take (5% gifted / 15% paid / 25% perpetual)',
          followups: [
            'Lock down the exact percentages per tier — does "gifted" mean Organic 30d?',
            'Decide how to present this to creators — does our 5% gifted feel free vs. confusing?',
            'Build a fee calculator into the creator rate-setting UI so they see their take-home',
            'Compare expected conversion impact vs. flat — model on the validated creator cohort'
          ]
        },
        C: {
          label: 'Brand subscription bundle',
          followups: [
            'Decide tier pricing and what each tier includes (N licenses/mo, premium analytics, etc.)',
            'Spec how this interacts with per-license fees — additive, replacement, or hybrid?',
            'Define the upsell trigger — when does a brand get pitched the subscription?',
            'Hold this decision until we have liquidity data — schedule a revisit in 6 months'
          ]
        }
      }
    },

    'D-03': {
      cluster: '01',
      title: 'UGC Studio · Story content scope in v1',
      question: 'Where does Story content live in v1 — out, screenshot-only, or video re-record?',
      options: {
        A: {
          label: 'Out of v1, document why',
          followups: [
            'Document the reason (Stories disappear in 24h; capture + legal complexity) in the v1 spec',
            'Add Stories to a v2 roadmap milestone with explicit conditions for revisiting',
            'Communicate to creators why their Story content isn\'t licensable yet — keep them opted-in for v2',
            'Make sure auto-detection (cluster 01, ID 96) skips Story events to avoid orphan signal data'
          ]
        },
        B: {
          label: 'In v1 with screenshot-only proof',
          followups: [
            'Spec the screenshot capture path — browser extension, mobile share sheet, or creator-uploaded?',
            'Define what "screenshot license" means legally — fair use, derivative work, IG terms-of-service risk',
            'Build the price tier for screenshot-Stories (likely 50–70% of full Story rate)',
            'Get legal review specifically on this — could be a release-blocker'
          ]
        },
        C: {
          label: 'In v1 with creator video re-record',
          followups: [
            'Spec the creator workflow: "Re-record this Story for licensing" — entry point, time pressure, asset preview',
            'Build the upload path and storage',
            'Decide pricing — does this match full Reel rate or sit between Story and Reel?',
            'Get creator feedback on whether re-record friction is acceptable before committing dev time'
          ]
        }
      }
    },

    'D-04': {
      cluster: '02',
      title: 'Brand Portal · category rankings tier',
      question: 'Should brand category rankings be visible to all brands, free; or premium-tier only?',
      options: {
        A: {
          label: 'All see rank, premium sees competitor names',
          followups: [
            'Define the premium tier — pricing, what else it includes beyond competitor names',
            'Spec the upgrade UX when a free brand wants to see the names behind "Brand X, Brand Y"',
            'Decide where the upgrade prompt appears — inline on the dashboard, in settings, both?',
            'Map the data display rules — top 10 always anonymized? top 3 named for premium only?'
          ]
        },
        B: {
          label: 'All brands see full data, free',
          followups: [
            'Define what we monetize instead — likely pushes brand CRM (D-06) into the premium tier',
            'Decide messaging — is full transparency our wedge to make brand portal sticky?',
            'Spec how to surface "this is your competitor" carefully — confirm with two paying brands first',
            'Model the risk of brand churn over being publicly compared'
          ]
        },
        C: {
          label: 'Premium tier only, no free version',
          followups: [
            'Define premium pricing relative to existing brand portal subscription',
            'Build the upgrade prompt for the dashboard "preview" state on free tier',
            'Decide what the free-tier dashboard shows instead — quotes? raw recommendation count?',
            'Model the word-of-mouth cost — premium-only means brands can\'t show each other'
          ]
        }
      }
    },

    'D-05': {
      cluster: '02',
      title: 'Brand Portal · dashboard placement in IA',
      question: 'Where does the Brand Intelligence Dashboard live — home, tab, or weekly email?',
      options: {
        A: {
          label: 'It IS the brand-portal home',
          followups: [
            'Spec the empty-state for brands with no recommendation data yet',
            'Decide what existing brand-portal pages (Campaigns, UGC Studio) become tabs/sub-sections',
            'Design the responsive mobile version of the dashboard',
            'Run the IA decision past Sienna for sales-context fit — does it support her conversations?'
          ]
        },
        B: {
          label: 'New "Insights" tab next to Campaigns',
          followups: [
            'Decide what the brand-portal home becomes if Insights is a tab',
            'Spec the "you should check Insights this week" nudge on home',
            'Less impact but less risk — confirm the tradeoff is what we want',
            'Plan an A/B test between A and B if leadership is uncertain'
          ]
        },
        C: {
          label: 'Weekly email digest',
          followups: [
            'Spec the email template and send cadence (Monday morning, 9am brand time?)',
            'Decide opt-out rules and frequency settings',
            'Pair this with whichever home (A or B) we ship — it\'s additive, not a replacement',
            'Build alongside the dashboard, not instead of it'
          ]
        }
      }
    },

    'D-06': {
      cluster: '02',
      title: 'Brand Portal · CRM build vs Attio/HubSpot',
      question: 'Build proprietary CRM, use Attio, or use HubSpot?',
      options: {
        A: {
          label: 'Build proprietary',
          followups: [
            'Confirm Tony\'s spec is current — pull from memory and verify scope',
            'Decide the minimum lovable CRM v1 — ICP scoring + contact tracking + outreach moments? more?',
            'Plan migration path off any existing tooling Sienna uses today',
            'Estimate 3-month build cost vs. opportunity cost of not building UGC Studio in parallel'
          ]
        },
        B: {
          label: 'Attio + custom data sync',
          followups: [
            'Map the Attio data model to brand-portal entities (brands, contacts, campaigns)',
            'Spec the sync — webhook? polling? bidirectional?',
            'Set up Sienna in Attio in week 1 — validate it does what she needs',
            'Define which behaviors stay in our app vs. live in Attio'
          ]
        },
        C: {
          label: 'HubSpot Sales Hub',
          followups: [
            'Audit HubSpot data model — can it represent ICP scoring our way?',
            'Cost compare with Attio at our team size',
            'Decide what sequencing features we actually need from HubSpot vs. could DIY',
            'Set up a pilot for Sienna and Tony separately to gauge feel'
          ]
        }
      }
    },

    'D-07': {
      cluster: '03',
      title: 'Campaign builder · wizard vs form',
      question: 'Form with progressive disclosure vs. 4–5 step wizard for the campaign builder?',
      options: {
        A: {
          label: 'Form with progressive disclosure',
          followups: [
            'Spec the section rail navigation — which sections are required vs. optional?',
            'Define progressive disclosure rules — what defaults handle 80% of campaigns?',
            'Build the right-rail live computation (estimated reach, pool size, cost)',
            'Test with one brand creating a real campaign before committing to the layout'
          ]
        },
        B: {
          label: '4–5 step wizard',
          followups: [
            'Define the 5 steps and lock the order',
            'Spec back-navigation and save-and-resume',
            'Decide if this branches by campaign type (gifted vs paid vs gift-card)',
            'Plan for power-user shortcuts — "skip basics" for repeat campaigns'
          ]
        },
        C: {
          label: 'Templates first, customize after',
          followups: [
            'Requires campaign templates (ID 14) to ship first — confirm sequencing',
            'Spec the template gallery and "create from template" flow',
            'Decide which campaigns become starter templates — pull from successful past campaigns',
            'Define how custom edits diverge from a template and whether we track that'
          ]
        }
      }
    },

    'D-08': {
      cluster: '03',
      title: 'Selection-cap mobile UX (the May 8 Slack thread)',
      question: 'How should the mobile creator picker behave when the campaign has a product cap?',
      options: {
        A: {
          label: 'Soft state from the start (disabled cards with "swap one to add")',
          followups: [
            'Update Step1Product.tsx to render disabled cards with explanatory copy instead of toast',
            'Make the cap configurable per-campaign (ID 148 — needs the backend toggle)',
            'Update the footer "X of Y picked" counter to live-update',
            'QA across all 4 prototypes (3046, 3048, 3049, 3056) to catch the variant that\'s diverged'
          ]
        },
        B: {
          label: 'Allow tap, prompt to swap',
          followups: [
            'Spec the swap-bottom-sheet UX with which card to drop',
            'Update Toast.tsx to be replaced with a modal pattern',
            'Decide what happens on cancel — keep the original 2, or drop both?',
            'A/B against Direction A if we\'re uncertain'
          ]
        },
        C: {
          label: 'Keep current toast warning',
          followups: [
            'Status quo — document why we kept it (probably won\'t pick this)',
            'Improve the toast copy to be less error-y if we stay here',
            'Note: this loses the Earth Science use case (creators picking 3 products)'
          ]
        }
      }
    },

    'D-09': {
      cluster: '04',
      title: 'Onboarding · "Why brands should pick you" question',
      question: 'Is the "why pick you" prompt friction (required), filter (verified badge), or cut?',
      options: {
        A: {
          label: 'Optional, unlocks a "verified" badge after review',
          followups: [
            'Spec the verification review flow — who reviews? what\'s the SLA?',
            'Design the "verified" badge surface across creator profiles + brand pool views',
            'Decide what a brand-side filter for verified-only looks like',
            'Build the optional onboarding prompt with skip + come-back-later'
          ]
        },
        B: {
          label: 'Required for all new creators',
          followups: [
            'Measure baseline bounce rate to set a "this can\'t get worse than X%" threshold',
            'Design the prompt to be quick — 60-second answer, not a paragraph',
            'A/B test required vs. optional with the first 100 new signups',
            'Have a fallback for nanos who don\'t articulate well — maybe a "we\'ll vouch for you" admin override'
          ]
        },
        C: {
          label: 'Cut entirely',
          followups: [
            'Document why — likely "friction outweighs signal"',
            'Decide what other trust signals brands lean on instead (ratings, engagement, intro video)',
            'Brief Sienna that the second-email questions are now onboarding-only'
          ]
        }
      }
    },

    'D-10': {
      cluster: '04',
      title: 'Brand ratings on creator profiles',
      question: 'How visible should brand ratings of creators be?',
      options: {
        A: {
          label: 'Aggregate score visible, individual ratings hidden',
          followups: [
            'Define minimum sample size before showing aggregate (3 campaigns? 5?)',
            'Spec the rating prompt that goes to brands post-campaign',
            'Decide what factors roll into the score (on-time? on-brief? performance?)',
            'Build the abuse-detection — one petty brand can still tank an aggregate of 3'
          ]
        },
        B: {
          label: 'Individual ratings visible with brand names',
          followups: [
            'Build a creator-side dispute/appeal flow — non-negotiable for fairness',
            'Define removal criteria — can a creator request a rating be removed if unfair?',
            'Spec the brand-rating UI on the creator profile',
            'Get legal review — defamation risk with named negative ratings'
          ]
        },
        C: {
          label: 'Ratings hidden, used internally only',
          followups: [
            'Define how ratings feed matching internally — does it score creators in brand pools?',
            'Decide whether creators see their own rating',
            'Spec the rating collection flow even if it\'s invisible'
          ]
        }
      }
    },

    'D-11': {
      cluster: '05',
      title: 'Hashtag automation · helper or gate',
      question: 'Should missing-hashtag detection be a soft prompt, a hard gate, or campaign-configurable?',
      options: {
        A: {
          label: 'Soft prompt before publish',
          followups: [
            'Spec the "did you mean to add #brand?" dialog — copy and dismissal',
            'Define which hashtags trigger this — brand-required only, or any?',
            'Add an analytics event so we know how often it fires + how often it\'s ignored',
            'Build the brand-side toggle that\'s soft by default but allows override'
          ]
        },
        B: {
          label: 'Hard gate; can\'t mark complete without hashtag',
          followups: [
            'Communicate the policy clearly in the campaign brief — creators must opt-in knowing this',
            'Decide what happens if IG/TikTok hashtag detection is wrong (false negative)',
            'Build an admin override for edge cases',
            'Measure creator dropout impact — this is the risky path'
          ]
        },
        C: {
          label: 'Brand picks per campaign',
          followups: [
            'Build the campaign-config toggle (soft / hard / off) as part of Campaign Builder v2',
            'Default to soft so we don\'t accidentally hard-gate every campaign',
            'Build the creator-side display — show which campaigns are strict before they accept',
            'Coordinate with cluster 03 — this lives in the builder'
          ]
        }
      }
    },

    'D-12': {
      cluster: '06',
      title: 'Link library placement in creator portal',
      question: 'Is the link library the creator-portal home, a second tab, or built into list pages?',
      options: {
        A: {
          label: 'Library IS the creator-portal home',
          followups: [
            'Spec the new IA — what happens to Campaigns and Lists as nav items',
            'Test with power creators (Morgan, Sydny) — does this feel right?',
            'Decide what new creators see when their library is empty (zero state)',
            'Disruptive — confirm it\'s worth the cost of changing the nav'
          ]
        },
        B: {
          label: 'Second tab next to Campaigns and Lists',
          followups: [
            'Decide the order of nav tabs — Library before or after Campaigns?',
            'Spec the badge / counter that draws attention to library',
            'Lowest-disruption path — recommended starting point',
            'Plan an upgrade path to A if data says library is the most-visited tab'
          ]
        },
        C: {
          label: 'Built into each list page',
          followups: [
            'Spec how "my links across all lists" surfaces if there\'s no library page',
            'Conceptually cleaner; probably doesn\'t match how creators think',
            'Validate by asking 5 creators "when you want to find a link you made last week, where do you go?"',
            'Likely wrong but worth checking'
          ]
        }
      }
    },

    'D-13': {
      cluster: '06',
      title: 'Link revenue data source for v1',
      question: 'Where does revenue data come from for the link library in v1?',
      options: {
        A: {
          label: 'Clicks only in v1; revenue in v1.5',
          followups: [
            'Lock the v1 scope to click-tracking (which we have) and ship',
            'Define the v1.5 milestone — what affiliate-network integrations make revenue real?',
            'Decide what messaging to use when creators ask "where\'s my $$?"',
            'Plan the affiliate-network rollout (ID 19) in parallel'
          ]
        },
        B: {
          label: 'Revenue from AWIN + SkimLinks only',
          followups: [
            'Build the data sync from AWIN + SkimLinks reporting',
            'Spec how to surface "no revenue data" gracefully for non-AWIN links',
            'Decide if we hide links without revenue data or show "—"',
            'Be honest about the holes — partial data corrodes trust'
          ]
        },
        C: {
          label: 'Wait for Impact/CJ/Rakuten before launching analytics',
          followups: [
            'Decide what creators see in the meantime — just click count?',
            'Plan the affiliate-network rollout aggressively (ID 19 becomes critical)',
            'Likely wrong — slowest path, and creators have been asking for ages'
          ]
        }
      }
    },

    'D-14': {
      cluster: '07',
      title: 'Stories · keep / hide / remove',
      question: 'What do we do with the Stories feature?',
      options: {
        A: {
          label: 'User-level toggle, default off for new users',
          followups: [
            'Build the backend flag (already specced in ID 110)',
            'Decide the migration — do existing Story-users keep them on?',
            'Spec the settings UI for toggling',
            'Plan the comms — how do we explain this to users?'
          ]
        },
        B: {
          label: 'Remove entirely',
          followups: [
            'Decide migration for existing Stories — archive? delete?',
            'Plan the comms — this is a feature deletion, needs care',
            'Define what fills the gap in the app (probably nothing — that\'s the point)',
            'Audit downstream — any signal or recommendation surface that depends on Stories?'
          ]
        },
        C: {
          label: 'Keep as-is',
          followups: [
            'Document why — likely "no clear evidence either way yet"',
            'Define a review milestone — revisit in 90 days with usage data',
            'Make sure Stories aren\'t accidentally promoted into the new discovery experience'
          ]
        }
      }
    },

    'D-15': {
      cluster: '07',
      title: 'Vertical strategy',
      question: 'How should we treat verticals (beauty, fashion, food, travel)?',
      options: {
        A: {
          label: 'Separate vertical sites for SEO/acquisition only',
          followups: [
            'Build vertical landing pages — content-driven, indexed by Google',
            'Decide which 3–5 verticals to launch with',
            'Make sure they feed into the main product on signup, not a fork',
            'Coordinate with cluster 09 — vertical landing is also growth (ID 47)'
          ]
        },
        B: {
          label: 'One product, vertical-aware home per signed-in user',
          followups: [
            'Spec how the home detects user vertical — declared interests, implicit from saves',
            'Design the vertical-aware feed UI (depends on discovery sprint, cluster 07)',
            'Decide what happens to multi-vertical users',
            'Run the 3-week prototype sprint with this as one of the candidates'
          ]
        },
        C: {
          label: 'True product split (separate apps per vertical)',
          followups: [
            'Probably wrong — but if exploring, define which vertical has the strongest standalone case',
            'Audit creator overlap — most creators span verticals; splitting hurts them',
            'Quantify the cost of duplicate eng/design/data infra'
          ]
        }
      }
    },

    'D-16': {
      cluster: '07',
      title: 'Discovery work · timing',
      question: 'Defer discovery to Q4 to focus on UGC + Brand Portal, run sprint now, or make discovery #1?',
      options: {
        A: {
          label: 'Defer to Q4',
          followups: [
            'Communicate to the team — this means no consumer-side new work this quarter',
            'Schedule the prototype sprint kickoff for early Q4',
            'Set guardrails — anything consumer-facing that comes up gets a "Q4" sticker',
            'Make sure cluster 09 (growth loops) still ships — that\'s not the same thing as discovery'
          ]
        },
        B: {
          label: 'Run 3-week prototype sprint now in parallel; commit Q4',
          followups: [
            'Define who owns the sprint (you? Des? hire?)',
            'Lock the three candidate hypotheses (people-first, interest-first, vertical) before week 1',
            'Plan the user testing — recruit cohorts of active + lapsed users',
            'Schedule the convergence read-out for end of week 3'
          ]
        },
        C: {
          label: 'Make discovery #1; defer UGC Studio',
          followups: [
            'Probably wrong — but if defending, the case is that without consumer DAUs the brand side eventually starves',
            'Tony alignment is required for this — this changes the company priority',
            'If chosen, plan the comms to creators who were asking for UGC Studio'
          ]
        }
      }
    },

    'D-17': {
      cluster: '08',
      title: 'Community pilot · PNW or POTS',
      question: 'Which real community do we pilot first — Sydny\'s PNW creators or Sophia\'s POTS?',
      options: {
        A: {
          label: 'Sydny\'s PNW creators (creators)',
          followups: [
            'Loop Sydny in as co-designer — confirm she\'d host',
            'Roster her ~12 micro-influencers as the seed members',
            'Define the recurring activity — weekly prompt? content challenge?',
            'Set the 60-day pilot success criteria (engagement + warm leads to Benable)'
          ]
        },
        B: {
          label: 'Sophia\'s POTS (consumers)',
          followups: [
            'Loop Sophia in as co-designer — confirm she\'d invite POTS people she knows',
            'Spec the trust + safety setup — chronic illness community is sensitive',
            'Define the shared activity — shared rec collection? Q&A thread?',
            'Set 60-day success criteria — return engagement is the primary metric'
          ]
        },
        C: {
          label: 'Both in parallel',
          followups: [
            'Doubles the operational cost of a pilot — confirm we have capacity',
            'Decide whether to share a feature build or fork',
            'Compare learnings at 60 days and pick a primary'
          ]
        }
      }
    },

    'D-18': {
      cluster: '08',
      title: 'Forum / tagging · pilot now or wait',
      question: 'Pilot the PiFi-style tagging system now, wait until community pilot is done, or drop?',
      options: {
        A: {
          label: 'Build basic tagging into list discovery now',
          followups: [
            'Spec the minimum tagging mechanic — list-author-tagged only, or also viewer-tagged?',
            'Decide which tags exist on day one (probably interests-based: skincare, hiking, etc.)',
            'Build the "browse by tag" discovery surface',
            'Plan the moderation — what stops tag spam?'
          ]
        },
        B: {
          label: 'Wait for community pilot to inform tagging design',
          followups: [
            'Document the dependency — tagging is most useful with participants',
            'Let community pilot generate organic tag candidates we can adopt',
            'Set a check-in milestone — review tagging again after 60 days of community pilot'
          ]
        },
        C: {
          label: 'Drop forum/tagging entirely',
          followups: [
            'Hold this decision until after the community pilot',
            'Premature to drop until we know if community + tagging are linked or independent'
          ]
        }
      }
    },

    'D-19': {
      cluster: '09',
      title: 'Reactivation · existing email tool or build internal',
      question: 'Use an existing email tool (Customer.io etc) or build internal reactivation?',
      options: {
        A: {
          label: 'Existing tool with our segmentation feeding in',
          followups: [
            'Pick the tool — Customer.io, Iterable, or Braze?',
            'Spec the segmentation pipeline — which Benable events drive which audiences',
            'Build the copy library and A/B framework',
            'Set up the always-on 5% random-template arm for ongoing learning'
          ]
        },
        B: {
          label: 'Internal build',
          followups: [
            'Define the deliverability + unsub + abuse handling — this is the real cost',
            'Decide what segmentation our internal system supports that an external one couldn\'t',
            'Estimate eng time vs. external tool cost — usually internal loses'
          ]
        }
      }
    },

    'D-20': {
      cluster: '09',
      title: 'Referral rewards · model',
      question: 'Financial-only, status-only, or hybrid for referral rewards?',
      options: {
        A: {
          label: 'Financial only (current)',
          followups: [
            'Audit current cash-incentive levels — is 0.1 K-factor optimized or undertuned?',
            'Run a 2x-credit event experiment to measure elasticity',
            'Likely keep but enhance — see Direction B'
          ]
        },
        B: {
          label: 'Hybrid — small financial + visible status',
          followups: [
            'Design the streak / momentum visual (badges, displays)',
            'Spec the "your friends about to drop off" nudges (already in cluster 09 design)',
            'Build the share-art generator for personal social posts',
            'A/B against status-only and financial-only'
          ]
        },
        C: {
          label: 'Status only — replace cash with badges/perks',
          followups: [
            'High risk — financial referrals are the proven part',
            'Define what perks status unlocks (early access to features? listed publicly?)',
            'Probably wrong as default; could test as a treatment'
          ]
        }
      }
    },

    'D-21': {
      cluster: '10',
      title: 'Event loop · product roadmap or ops tooling',
      question: 'Who owns the productized event loop?',
      options: {
        A: {
          label: 'Product roadmap (Julia owns)',
          followups: [
            'Crowds out consumer/brand work — confirm tradeoff',
            'Define the v1 scope inside the next quarter',
            'Coordinate with Tony on what consumer features get deprioritized'
          ]
        },
        B: {
          label: 'Internal tools track (Tony\'s team / eng directly)',
          followups: [
            'Brief Tony — propose ownership',
            'Decide which eng resources support this without crowding the consumer roadmap',
            'Specify hand-off interfaces — what data the event tool reads/writes in our DB',
            'Likely correct — confirm with Tony on Monday'
          ]
        },
        C: {
          label: 'Hybrid — Julia spec\'d, eng-built, Tony-team operated',
          followups: [
            'Define spec scope so it doesn\'t require ongoing your-time',
            'Coordination overhead — set up a clean hand-off doc',
            'Reasonable middle if Tony doesn\'t want full ownership'
          ]
        }
      }
    },

    'D-22': {
      cluster: '11',
      title: 'Local · vertical to test first',
      question: 'Restaurants or experiences (hotels, HipCamp, Airbnb)?',
      options: {
        A: {
          label: 'Restaurants (Jessica\'s signal)',
          followups: [
            'Define the 3 test cities + 5 creators each — start with Jessica\'s metro?',
            'Pitch the experiment to 3 local brands at $500 / 5 creators / 2 deliverables',
            'Define attribution — unique reservation links, mention tracking, manual recall',
            'Set the 2-week experiment timeline and go/no-go criteria'
          ]
        },
        B: {
          label: 'Boutique hotels / experiences (Sydny\'s signal)',
          followups: [
            'Larger budgets per deal — needs more careful brand selection',
            'Longer feedback loop (book → stay → content) — set experiment to 8 weeks not 2',
            'Loop Sydny in as the bridge to HipCamp/Airbnb host networks',
            'Plan the upside math — if it works, this vertical is bigger'
          ]
        },
        C: {
          label: 'Both in parallel',
          followups: [
            'Doubles experiment cost; halves clarity of read-out',
            'Probably wrong — pick one, get a clean signal'
          ]
        }
      }
    },

    'D-23': {
      cluster: '12',
      title: 'Internal AI tools · ownership model',
      question: 'Opportunistic, dedicated track, or outsourced?',
      options: {
        A: {
          label: 'Opportunistic — when Build-a-thon surfaces something concrete, build it',
          followups: [
            'Define what counts as "concrete enough" to warrant a build',
            'Set a quarterly review of internal-tool ideas to triage',
            'Decide who triages — probably you',
            'Keep a backlog separately so ideas don\'t evaporate'
          ]
        },
        B: {
          label: 'Dedicate part-time eng to "internal tools team"',
          followups: [
            'Pick the eng person',
            'Define their first 90-day backlog (prototype review tool, AI creator cards, etc.)',
            'Set the success measure — ideally team-wide time saved, not features shipped',
            'Reasonable in 6 months once team grows'
          ]
        },
        C: {
          label: 'Outsource to AI / contractors',
          followups: [
            'Highest risk for tools that touch prod data (Benny especially)',
            'Cheapest for clearly-scoped one-off tools',
            'Define what stays in-house vs. outsource-able'
          ]
        }
      }
    },

    'D-24': {
      cluster: '13',
      title: 'Mobile · backfill attribution',
      question: 'How transparent are we to affected users like Walteria when fixing the deep-link bug?',
      options: {
        A: {
          label: 'Backfill silently + add inviter relationship',
          followups: [
            'Build the backfill query — find all skip1-attributed users with GTA6S-pattern Fullstory events',
            'Verify the attribution rewrite doesn\'t break referral payouts',
            'Apply Tony as inviter retroactively for GTA6S users',
            'Coordinate with Sienna on user-facing comms (probably none for this group)'
          ]
        },
        B: {
          label: 'Send affected users a "we noticed" email + manual acceptance',
          followups: [
            'Decide who drafts the email — owns brand voice',
            'Build the confirm/decline UI for backfilled invites',
            'Heavy on engineering for a small population — verify it\'s worth it',
            'Get legal/privacy review on the email'
          ]
        },
        C: {
          label: 'Don\'t backfill; only fix forward',
          followups: [
            'Decide if we tell affected users at all — silence might be worse than admission',
            'Document the call for posterity',
            'Cheapest engineering but unfair to inviters'
          ]
        }
      }
    }
  };

  // Generate a per-decision prompt
  function continuePrompt(decisionId) {
    const decision = DECISIONS[decisionId];
    if (!decision) return null;

    const state = global.IGR.getState();
    const userDecision = state.decisions[decisionId];

    const cluster = CLUSTERS[decision.cluster];
    const baseUrl = inferBaseUrl();

    const lines = [];
    lines.push(`# Continue work on ${decisionId} · ${decision.title}`);
    lines.push('');

    if (cluster) {
      lines.push(`**Cluster ${decision.cluster} · ${cluster.title}**`);
      lines.push('');
      lines.push(cluster.context);
      lines.push('');
    }

    lines.push(`## The decision`);
    lines.push(decision.question);
    lines.push('');

    if (userDecision && userDecision.option) {
      const option = decision.options[userDecision.option];
      if (option) {
        lines.push(`## What I decided`);
        lines.push(`**Option ${userDecision.option}: ${option.label}**`);
        lines.push('');
        if (userDecision.note) {
          lines.push(`> ${userDecision.note}`);
          lines.push('');
        }
        lines.push(`## Next work to explore`);
        for (const f of option.followups) {
          lines.push(`- ${f}`);
        }
        lines.push('');
      }
    } else {
      // Not picked yet — surface all options
      lines.push(`## Options on the table (not yet picked)`);
      for (const [letter, opt] of Object.entries(decision.options)) {
        lines.push(`- **${letter}** · ${opt.label}`);
      }
      lines.push('');
    }

    lines.push(`## Reference`);
    lines.push(`Cluster page: ${baseUrl}/clusters/${decision.cluster}-${slugifyCluster(decision.cluster)}/index.html`);
    lines.push(`Open decisions: ${baseUrl}/decisions/open-questions.html#${decisionId}`);

    return lines.join('\n');
  }

  function continuePromptForAll() {
    const state = global.IGR.getState();
    const ids = Object.keys(state.decisions);
    if (ids.length === 0) {
      return '# No decisions yet\n\nVisit the Open Decisions page to start picking.';
    }

    const lines = [];
    lines.push(`# Continue: pick up where I left off (${ids.length} decisions made)`);
    lines.push('');
    lines.push(`I made the following decisions on the idea garden review. Help me continue exploring them — start with whichever you think is highest leverage, or ask me what to prioritize.`);
    lines.push('');

    // Sort by decision number
    ids.sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10);
      const nb = parseInt(b.replace(/\D/g, ''), 10);
      return na - nb;
    });

    for (const id of ids) {
      const decision = DECISIONS[id];
      const userDecision = state.decisions[id];
      if (!decision || !userDecision || !userDecision.option) continue;
      const option = decision.options[userDecision.option];
      if (!option) continue;

      lines.push(`---`);
      lines.push('');
      lines.push(`## ${id} · ${decision.title}`);
      lines.push(`Picked: **Option ${userDecision.option} — ${option.label}**`);
      if (userDecision.note) {
        lines.push(`Note: _${userDecision.note}_`);
      }
      lines.push('');
      lines.push(`Follow-ups I want to explore:`);
      for (const f of option.followups) {
        lines.push(`- ${f}`);
      }
      lines.push('');
    }

    if (state.freeNotes && state.freeNotes.trim()) {
      lines.push(`---`);
      lines.push('');
      lines.push(`## General notes`);
      lines.push(state.freeNotes.trim());
      lines.push('');
    }

    return lines.join('\n');
  }

  function inferBaseUrl() {
    if (typeof window === 'undefined') return '';
    // If file:// or local preview, use a placeholder so paths are still readable
    const origin = window.location.origin;
    if (origin.startsWith('file://') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://juliabenable.github.io/idea-garden-review-1';
    }
    return origin;
  }

  function slugifyCluster(num) {
    const slugs = {
      '01': 'ugc-studio',
      '02': 'brand-portal-sales',
      '03': 'campaign-config',
      '04': 'creator-onboarding',
      '05': 'creator-portal-qol',
      '06': 'affiliate-links',
      '07': 'discovery-rethink',
      '08': 'community-social',
      '09': 'growth-loops',
      '10': 'events-strategy',
      '11': 'local-matching',
      '12': 'internal-ai',
      '13': 'mobile-investigation',
      '14': 'idea-garden'
    };
    return slugs[num] || '';
  }

  // Attach to IGR (state.js must load first; both use defer so order is preserved)
  function attach() {
    if (!global.IGR) {
      setTimeout(attach, 30);
      return;
    }
    global.IGR.continuePrompt = continuePrompt;
    global.IGR.continuePromptForAll = continuePromptForAll;
    global.IGR.DECISIONS = DECISIONS;
    global.IGR.CLUSTERS = CLUSTERS;
  }
  attach();
})(window);
