// Handover to MyMedIn — currently DORMANT.
//
// Flip to true (and redeploy) to retire this app: the whole UI is replaced by
// the handover screen. A build-time constant on purpose — retirement is
// deliberate and permanent, so there's no runtime toggle that could flip by
// accident.
//
// Before flipping, both of these must be true, or signed-in users hit a dead
// end on the one-tap handoff:
//   1. MyMedIn's /handoff receiver is live (see mymedin-handoff-spec.md)
//   2. HANDOFF_SECRET is set to the SAME value on both APIs
//
// Then pair it with RETIRED=true on this API, which is the actual kill switch —
// this constant only controls what users see.
export const RETIRED = false;

export const MYMEDIN_URL = "https://mymedin.com";
